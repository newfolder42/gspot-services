import { z } from 'zod';

export const UserConnectionCreatedPayloadSchema = z.object({
  id: z.number(),
  type: z.string(),
  userId: z.number(),
  connectionId: z.number(),
});

export const UserConnectionCreatedSchema = z.object({
  resource: z.literal('user_connection'),
  action: z.literal('created'),
  createdAt: z.string(),
  payload: UserConnectionCreatedPayloadSchema,
});

export type UserConnectionCreatedPayload = z.infer<typeof UserConnectionCreatedPayloadSchema>;
export type UserConnectionCreatedEvent = z.infer<typeof UserConnectionCreatedSchema>;
