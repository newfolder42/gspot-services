import { z } from 'zod';

export const UserProfilePhotoChangedSchema = z.object({
  resource: z.literal('user_profile_photo'),
  action: z.literal('changed'),
  createdAt: z.string(),
  payload: z.object({
    contentId: z.number(),
    userId: z.number(),
    userAlias: z.string(),
    profilePhotoUrl: z.string(),
    previousProfilePhotoUrl: z.string().nullable(),
    replacedExisting: z.boolean(),
  }),
});

export type UserProfilePhotoChangedEvent = z.infer<typeof UserProfilePhotoChangedSchema>;
