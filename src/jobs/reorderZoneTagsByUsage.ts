import { query } from '../lib/db';

export async function reorderZoneTagsByUsage() {
  console.log('Running zone tag reorder by usage');

  try {
    const result = await query(
      `WITH usage_counts AS (
         SELECT
           zt.id AS tag_id,
           zt.zone_id,
           COUNT(pt.*)::int AS usage_count
         FROM zone_tags zt
         LEFT JOIN post_tags pt ON pt.tag_id = zt.id
         GROUP BY zt.id, zt.zone_id
       ),
       ranked AS (
         SELECT
           tag_id,
           ROW_NUMBER() OVER (
             PARTITION BY zone_id
             ORDER BY usage_count DESC, tag_id ASC
           ) - 1 AS new_sort_order
         FROM usage_counts
       )
       UPDATE zone_tags zt
       SET sort_order = ranked.new_sort_order
       FROM ranked
       WHERE zt.id = ranked.tag_id
         AND zt.sort_order IS DISTINCT FROM ranked.new_sort_order
       RETURNING zt.id`
    );

    console.log(`Reordered ${result.rowCount || 0} zone tags by usage`);
  } catch (err) {
    console.error('Error reordering zone tags by usage', err);
  }
}