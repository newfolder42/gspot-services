import { PostProcessing } from '../types/post-processing';
import ExifReader from 'exifreader';
import { query } from '../lib/db';
import { PostType } from '../types/post';
import { publish } from '../lib/redis';

export default async function handlePostProcessing(event: PostProcessing) {
  if (event.payload.postType !== 'gps-photo') return;

  const payload = event.payload;

  try {
    const post = await getPostById(payload.postId);
    if (!post) return;

    // Extract GPS from the S3 image
    const { latitude, longitude, dateTaken } = await extractGPSFromS3Image(post.image_url);

    // Validate GPS coordinates
    if (!latitude || !longitude) {
      console.error(`No GPS coordinates found in image for post ${payload.postId}`);

      await query(
        `UPDATE posts SET status = $2 WHERE id = $1`,
        [payload.postId, 'failed']
      );

      await publish('post', 'failed', {
        postId: +post.id,
        postType: 'gps-photo',
        postTitle: post.title || '',
        authorId: +post.userId,
        authorAlias: post.userAlias,
        reason: 'NO_GPS_COORDINATES',
      });
      return;
    }

    // Check if coordinates are in Georgia (41.0-43.5 N, 40.0-46.5 E)
    const isInGeorgia = latitude >= 41.0 && latitude <= 43.5 && longitude >= 40.0 && longitude <= 46.5;

    if (!isInGeorgia) {
      console.error(`GPS coordinates outside Georgia for post ${payload.postId}: ${latitude}, ${longitude}`);

      await query(
        `UPDATE posts SET status = $1 WHERE id = $2`,
        [payload.postId, 'failed']
      );

      await publish('post', 'failed', {
        postId: +post.id,
        postType: 'gps-photo',
        postTitle: post.title || '',
        authorId: +post.userId,
        authorAlias: post.userAlias,
        reason: 'INVALID_GPS_COORDINATES',
      });
      return;
    }

    console.log(`Valid GPS coordinates found: ${latitude}, ${longitude}`);

    await query(
      `UPDATE user_content
       SET details = jsonb_set(
         COALESCE(details, '{}'::jsonb),
         '{coordinates}',
         $1::jsonb
       )
       WHERE id = $2`,
      [JSON.stringify({ latitude, longitude }), post.content_id]
    );

    await query(
      `UPDATE posts SET status = $2 WHERE id = $1`,
      [payload.postId, 'published']
    );

    console.log(`✓ Post ${payload.postId} successfully processed and published`);

    await publish('post', 'published', {
      postId: +post.id,
      postType: 'gps-photo',
      postTitle: post.title || '',
      authorId: +post.userId,
      authorAlias: post.userAlias,
    });

  } catch (error) {
    console.error(`Error processing post ${payload.postId}:`, error);

    await query(
      `UPDATE posts SET status = $2 WHERE id = $1`,
      [payload.postId, 'failed']
    );
  }
}

async function extractGPSFromS3Image(imageUrl: string) {
  try {
    console.log(`Fetching image from S3: ${imageUrl}`);

    // Fetch the image from S3
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Extract EXIF data using ExifReader
    const tags = ExifReader.load(imageBuffer);

    let latitude: number | null = null;
    let longitude: number | null = null;
    let dateTaken: string | null = null;

    // Extract GPS coordinates
    if (tags.GPSLatitude && tags.GPSLongitude) {
      latitude = tags.GPSLatitude.description ? parseFloat(tags.GPSLatitude.description) : null;
      longitude = tags.GPSLongitude.description ? parseFloat(tags.GPSLongitude.description) : null;
    }

    // Extract date taken
    if (tags.DateTimeOriginal) {
      dateTaken = tags.DateTimeOriginal.description || null;
    } else if (tags.DateTime) {
      dateTaken = tags.DateTime.description || null;
    }

    return { latitude, longitude, dateTaken };
  } catch (error) {
    console.error('Error extracting GPS:', error);
    throw error;
  }
}

export async function getPostById(id: number): Promise<PostType | null> {
  const res = await query(
    `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, u.alias as author_alias, uc.public_url as image_url,
    pc.content_id
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.id = pc.content_id
where p.id = $1
order by pc.sort
limit 1`,
    [id]
  );

  if (res.rowCount === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    date: r.created_at,
    userId: r.user_id,
    status: r.status,
    userAlias: r.author_alias,
    content_id: r.content_id,
    image_url: r.image_url,
  };
}