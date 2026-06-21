import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

const s3client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWSS3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWSS3_SECRET_ACCESS_KEY!,
  },
});

/** Download an object's bytes into a Buffer. Throws on failure. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = res.Body as unknown as AsyncIterable<Uint8Array> | undefined;
  if (!body) throw new Error(`getObjectBuffer: empty body for key ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Upload bytes to a known key. No ACL is set — the bucket serves objects via its policy, and an
 * explicit ACL can fail under "Bucket owner enforced" object ownership.
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl: string = 'public, max-age=31536000, immutable',
) {
  return s3client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}
