/**
 * Why a post's location was contested — the same list, in the same words, as the web and the
 * app (gspot-web/src/types/post-location.ts). Kept here because this service cannot import
 * from the web project.
 */
export const LOCATION_DISPUTE_REASON_LABELS: Record<string, string> = {
  wrong_place: 'ლოკაცია სხვა ადგილას არის',
  subject_not_camera: 'კოორდინატები კადრის ობიექტზეა და არა გადაღების ადგილზე',
  other: 'სხვა',
};

/** The reason in words; an unknown or missing reason reads as nothing rather than as a key. */
export function locationDisputeReasonLabel(reason: string | null | undefined): string | null {
  return reason ? LOCATION_DISPUTE_REASON_LABELS[reason] ?? null : null;
}
