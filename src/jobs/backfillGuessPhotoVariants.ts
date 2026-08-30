/**
 * ONE-OFF backfill: generate the missing `feed`/`thumb` WebP derivatives for
 * on-site guess photos ("გამოცნობა ადგილზე").
 *
 * Guess photos used to be uploaded as a single ~4096px master and rendered
 * straight into the small comment thumbnail. gspot-web now runs every new guess
 * photo through its image pipeline; this script does the same for the ones
 * already in S3, and writes the resulting URLs into
 *   user_content.details.variants          (type = 'guess-photo')
 *   post_comments.metadata.imageVariants   (type = 'gps-photo-guess-comment')
 *
 * Sizes/quality mirror gspot-web `src/lib/image-pipeline.ts` — keep them in sync
 * if that file changes. The master object is never touched or re-encoded.
 *
 * Run once, then delete this file (and the `backfill:guess-photo-variants`
 * script, plus the `sharp` / `@aws-sdk/client-s3` deps if nothing else uses them):
 *
 *   npm run backfill:guess-photo-variants -- --dry-run
 *   npm run backfill:guess-photo-variants
 *
 * Needs S3_BUCKET, AWS_REGION, AWSS3_ACCESS_KEY_ID, AWSS3_SECRET_ACCESS_KEY in .env.
 */
// import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
// import sharp from 'sharp';
// import dotenv from 'dotenv';
// import { query, dbclose } from '../lib/db';

// dotenv.config();

// const BUCKET = process.env.S3_BUCKET;
// const REGION = process.env.AWS_REGION;

// /** Same shape gspot-web writes, so the clients need no extra handling. */
// type ImageVariants = { thumb: string; feed: string };

// const SMALL_VARIANTS = {
//   feed: { width: 1280, quality: 80 },
//   thumb: { width: 400, quality: 72 },
// } as const;

// const s3 = new S3Client({
//   region: REGION,
//   credentials: {
//     accessKeyId: process.env.AWSS3_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWSS3_SECRET_ACCESS_KEY!,
//   },
//   requestChecksumCalculation: 'WHEN_REQUIRED',
//   responseChecksumValidation: 'WHEN_REQUIRED',
// });

// async function getObjectBuffer(key: string): Promise<Buffer> {
//   const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
//   const body = res.Body as unknown as AsyncIterable<Uint8Array> | undefined;
//   if (!body) throw new Error(`empty body for key ${key}`);
//   const chunks: Uint8Array[] = [];
//   for await (const chunk of body) chunks.push(chunk);
//   return Buffer.concat(chunks);
// }

// async function putObject(key: string, body: Buffer) {
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: BUCKET,
//       Key: key,
//       Body: body,
//       ContentType: 'image/webp',
//       CacheControl: 'public, max-age=31536000, immutable',
//     })
//   );
// }

// /** `https://bucket.s3.../guess-photo/<uuid>` -> `guess-photo/<uuid>` */
// function keyFromUrl(publicUrl: string): string {
//   const base = publicUrl.split('?')[0];
//   return new URL(base).pathname.replace(/^\//, '');
// }

// async function buildVariants(publicUrl: string): Promise<ImageVariants> {
//   const base = publicUrl.split('?')[0];
//   const key = keyFromUrl(base);
//   const source = await getObjectBuffer(key);

//   const variants: ImageVariants = { feed: '', thumb: '' };
//   for (const [name, cfg] of Object.entries(SMALL_VARIANTS)) {
//     const out = await sharp(source, { failOn: 'none' })
//       .rotate() // bake EXIF orientation; default strips all other metadata
//       .resize(cfg.width, cfg.width, { fit: 'inside', withoutEnlargement: true })
//       .webp({ quality: cfg.quality })
//       .toBuffer();

//     await putObject(`${key}/${name}.webp`, out);
//     variants[name as keyof ImageVariants] = `${base}/${name}.webp`;
//   }
//   return variants;
// }

// type Row = { id: string; public_url: string; guess_id: number | null };

// export async function backfillGuessPhotoVariants(opts: { dryRun?: boolean; limit?: number } = {}) {
//   const { dryRun = false, limit } = opts;

//   if (!BUCKET || !process.env.AWSS3_ACCESS_KEY_ID || !process.env.AWSS3_SECRET_ACCESS_KEY) {
//     throw new Error('Missing S3_BUCKET / AWSS3_ACCESS_KEY_ID / AWSS3_SECRET_ACCESS_KEY');
//   }

//   const res = await query(
//     `select uc.id, uc.public_url, (uc.details->>'guessId')::int as guess_id
//        from user_content uc
//       where uc.type = 'guess-photo'
//         and uc.public_url is not null
//         and uc.details->'variants' is null
//       order by uc.id
//       ${limit ? `limit ${Number(limit)}` : ''}`
//   );

//   const rows: Row[] = res.rows;
//   console.log(`guess-photo rows without variants: ${rows.length}${dryRun ? ' (dry run)' : ''}`);

//   let done = 0;
//   let failed = 0;

//   for (const row of rows) {
//     try {
//       if (dryRun) {
//         console.log(`[dry-run] would process user_content ${row.id} -> ${keyFromUrl(row.public_url)}`);
//         done++;
//         continue;
//       }

//       const variants = await buildVariants(row.public_url);

//       await query(
//         `update user_content
//             set details = coalesce(details, '{}'::jsonb) || jsonb_build_object('variants', $2::jsonb)
//           where id = $1`,
//         [row.id, JSON.stringify(variants)]
//       );

//       // The comment is what renders the thumbnail; match on the guess it belongs to,
//       // falling back to the stored image URL for rows written before guessId existed.
//       const upd = await query(
//         `update post_comments
//             set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('imageVariants', $2::jsonb)
//           where type = 'gps-photo-guess-comment'
//             and (($1::int is not null and guess_id = $1::int) or metadata->>'imageUrl' = $3)`,
//         [row.guess_id, JSON.stringify(variants), row.public_url.split('?')[0]]
//       );

//       done++;
//       console.log(`ok user_content ${row.id} (comments updated: ${upd.rowCount || 0}) [${done}/${rows.length}]`);
//     } catch (err) {
//       failed++;
//       console.error(`failed user_content ${row.id} (${row.public_url})`, err);
//     }
//   }

//   console.log(`Backfill finished — processed ${done}, failed ${failed}`);
//   return { processed: done, failed };
// }

// // Run directly: `ts-node jobs/backfillGuessPhotoVariants.ts [--dry-run] [--limit=N]`
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   const dryRun = args.includes('--dry-run');
//   const limitArg = args.find((a) => a.startsWith('--limit='));
//   const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

//   backfillGuessPhotoVariants({ dryRun, limit })
//     .catch((err) => {
//       console.error('Backfill fatal error', err);
//       process.exitCode = 1;
//     })
//     .finally(async () => {
//       await dbclose();
//     });
// }
