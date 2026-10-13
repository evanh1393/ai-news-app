// Outage checks are paused while a new ingest system is worked out. The old log stays visible,
// but the live status (nav dot, "no active alerts") would be stale, so it's replaced with a notice.
// Flip to false once outage checks are flowing again.
export const OUTAGES_MAINTENANCE = true;
