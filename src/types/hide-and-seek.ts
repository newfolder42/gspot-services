import { z } from 'zod';

const base = {
  gameId: z.number(),
  postId: z.number(),
};

export const HideAndSeekCreatedPayloadSchema = z.object({
  ...base,
  title: z.string(),
  hostId: z.number(),
  hostAlias: z.string(),
  visibility: z.enum(['public', 'private']),
  endsAt: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  inviteeIds: z.array(z.number()).default([]),
});

export const HideAndSeekCreatedSchema = z.object({
  resource: z.literal('hide_and_seek'),
  action: z.literal('created'),
  createdAt: z.string(),
  payload: HideAndSeekCreatedPayloadSchema,
});

export const HideAndSeekJoinedPayloadSchema = z.object({
  ...base,
  hostId: z.number(),
  hostAlias: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  commentId: z.number(),
});

export const HideAndSeekJoinedSchema = z.object({
  resource: z.literal('hide_and_seek'),
  action: z.literal('joined'),
  createdAt: z.string(),
  payload: HideAndSeekJoinedPayloadSchema,
});

export const HideAndSeekCheckedPayloadSchema = z.object({
  ...base,
  hostId: z.number(),
  hostAlias: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  checkId: z.number(),
  commentId: z.number(),
  distanceMeters: z.number(),
  isNewBest: z.boolean(),
  found: z.boolean(),
});

export const HideAndSeekCheckedSchema = z.object({
  resource: z.literal('hide_and_seek'),
  action: z.literal('checked'),
  createdAt: z.string(),
  payload: HideAndSeekCheckedPayloadSchema,
});

export const HideAndSeekFoundPayloadSchema = z.object({
  ...base,
  hostId: z.number(),
  hostAlias: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  distanceMeters: z.number(),
  checkCount: z.number(),
});

export const HideAndSeekFoundSchema = z.object({
  resource: z.literal('hide_and_seek'),
  action: z.literal('found'),
  createdAt: z.string(),
  payload: HideAndSeekFoundPayloadSchema,
});

export const HideAndSeekEndedPayloadSchema = z.object({
  ...base,
  hostId: z.number(),
  reason: z.enum(['expired', 'host_ended', 'first_found']),
  participantIds: z.array(z.number()).default([]),
});

export const HideAndSeekEndedSchema = z.object({
  resource: z.literal('hide_and_seek'),
  action: z.literal('ended'),
  createdAt: z.string(),
  payload: HideAndSeekEndedPayloadSchema,
});

export type HideAndSeekCreatedEvent = z.infer<typeof HideAndSeekCreatedSchema>;
export type HideAndSeekJoinedEvent = z.infer<typeof HideAndSeekJoinedSchema>;
export type HideAndSeekCheckedEvent = z.infer<typeof HideAndSeekCheckedSchema>;
export type HideAndSeekFoundEvent = z.infer<typeof HideAndSeekFoundSchema>;
export type HideAndSeekEndedEvent = z.infer<typeof HideAndSeekEndedSchema>;
