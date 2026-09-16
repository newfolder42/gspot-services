import { z } from 'zod';

export const ItemFoundPayloadSchema = z.object({
  userId: z.number(),
  userAlias: z.string(),
  postId: z.number(),
  itemAlias: z.string(),
  itemName: z.string(),
  itemQuality: z.string(),
  itemIconUrl: z.string().nullable(),
  // how many the user holds after this grant — above 1 only for a stackable item
  itemCount: z.number().int().positive(),
  locationId: z.number(),
  locationName: z.string(),
});

/**
 * Published by gspot-web once the row is already in `user_items` — the grant runs inline
 * so the poster sees the find immediately. This event only carries the follow-up work:
 * the "შენს ინვენტარში მატებაა" notification and the items_collected achievement.
 */
export const ItemFoundSchema = z.object({
  resource: z.literal('item'),
  action: z.literal('found'),
  createdAt: z.string(),
  payload: ItemFoundPayloadSchema,
});

export type ItemFoundPayload = z.infer<typeof ItemFoundPayloadSchema>;
export type ItemFoundEvent = z.infer<typeof ItemFoundSchema>;
