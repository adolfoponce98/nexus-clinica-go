// Network fallbacks only. Push notifications and saved changes refresh immediately.
export const SYNC_POLICY = {
  activityReportMs: 10 * 60_000,
  activityRetryMs: 60_000,
  idleTimeoutMs: 60 * 60_000,
  officeFallbackMs: 15 * 60_000,
  appointmentFallbackMs: 15 * 60_000,
  devicesFallbackMs: 15 * 60_000,
  billingFallbackMs: 30 * 60_000,
} as const;
