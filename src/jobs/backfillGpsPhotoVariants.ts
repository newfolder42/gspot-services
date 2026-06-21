import sharp from 'sharp';
import { query } from '../lib/db';
import { getObjectBuffer, putObject } from '../lib/s3';

/**
 * Mirror of gspot-web/src/lib/image-pipeline.ts SMALL_VARIANTS — keep the sizes/quality in sync so
 * backfilled variants match newly-uploaded ones.
 */
const SMALL_VARIANTS = {
  feed: { width: 1280, quality: 80 },
  thumb: { width: 400, quality: 72 },
} as const;

const BUCKET = process.env.S3_BUCKET;

/** Derive the S3 object key from a stored public_url, robust to whitespace and URL style. */
function keyFromPublicUrl(publicUrl: string): string {
  const base = publicUrl.split('?')[0].trim();
  const url = new URL(base);
  // Strip scheme+host. Handles virtual-hosted (bucket.s3…/key) and path-style (s3…/bucket/key).
  let key = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (BUCKET && !url.hostname.startsWith(`${BUCKET}.`)) {
    key = key.replace(new RegExp(`^${BUCKET}/`), '');
  }
  return key;
}

function isNoSuchKey(err: any): boolean {
  return err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404;
}

/**
 * TEMPORARY one-shot backfill: find gps-photo content that predates the variant pipeline
 * (no `details.variants`), generate feed/thumb WebP derivatives, upload them to S3, and record the
 * variant URLs on the row. `full` reuses the existing master URL (the bare key) — no re-encode.
 *
 * Runs once at service startup, sequentially and best-effort (a broken row is logged and skipped).
 * Re-running only picks up rows that still lack variants, so it is safe to leave until the backlog
 * is cleared. Remove this job and its call in index.ts once that is done.
 */
export async function runBackfillGpsPhotoVariants() {
  console.log('[backfill-variants] starting');
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const res = await query(
      `select id, public_url from user_content
       where type = 'gps-photo' and (details->'variants') is null
       order by id asc`,
    );

    console.log(`[backfill-variants] ${res.rowCount ?? 0} rows to process`);

    for (const row of res.rows) {
      const id = row.id;
      const publicUrl: string = row.public_url;
      try {
        const base = publicUrl.split('?')[0].trim();
        const key = keyFromPublicUrl(publicUrl);
        console.log(`[backfill-variants] processing content id=${id} url=${publicUrl} key=${key}`);

        let source: Buffer;
        try {
          source = await getObjectBuffer(key);
        } catch (err: any) {
          if (isNoSuchKey(err)) {
            console.warn(`[backfill-variants] skipping id=${id}: no S3 object at key "${key}"`);
            skipped++;
            continue;
          }
          throw err;
        }

        const variants: Record<string, string> = {};
        for (const [name, cfg] of Object.entries(SMALL_VARIANTS)) {
          const out = await sharp(source, { failOn: 'none' })
            .rotate() // bake EXIF orientation; default strips all other metadata
            .resize(cfg.width, cfg.width, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: cfg.quality })
            .toBuffer();
          await putObject(`${key}/${name}.webp`, out, 'image/webp');
          variants[name] = `${base}/${name}.webp`;
        }

        await query(
          `update user_content set details = jsonb_set(details, '{variants}', $2::jsonb, true) where id = $1`,
          [id, JSON.stringify(variants)],
        );

        processed++;
        if (processed % 25 === 0) console.log(`[backfill-variants] processed ${processed}`);
      } catch (err) {
        failed++;
        console.error(`[backfill-variants] failed for content id=${id} url=${publicUrl}`, err);
      }
    }
  } catch (err) {
    console.error('[backfill-variants] fatal error', err);
  }

  console.log(`[backfill-variants] done — processed=${processed} skipped=${skipped} failed=${failed}`);
}
