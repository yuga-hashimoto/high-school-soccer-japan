export const COMPETITION_CATEGORIES = [
  "PREMIER",
  "PRINCE",
  "PREFECTURE",
  "DISTRICT",
  "OTHER",
] as const;

export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];

export const CLUB_TYPES = ["SCHOOL", "CLUB"] as const;
export type ClubType = (typeof CLUB_TYPES)[number];

export const SEASON_STATUSES = ["UPCOMING", "IN_PROGRESS", "COMPLETED"] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const MATCH_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const SOURCE_SCOPES = ["NATIONAL", "REGION", "PREFECTURE"] as const;
export type SourceScope = (typeof SOURCE_SCOPES)[number];

export const SOURCE_FORMATS = ["JSON", "HTML", "CSV", "PDF"] as const;
export type SourceFormat = (typeof SOURCE_FORMATS)[number];

/**
 * Registration state of a data source.
 * `UNSUPPORTED` and `NEEDS_PARSER` are first-class so that missing nationwide
 * coverage is explicitly recorded instead of silently dropped.
 */
export const SOURCE_STATUSES = [
  "ACTIVE",
  "PARTIAL",
  "NEEDS_PARSER",
  "UNSUPPORTED",
  "ERROR",
  "DISABLED",
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const HEALTH_STATUSES = ["OK", "PARTIAL", "FAILED", "UNKNOWN"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];
