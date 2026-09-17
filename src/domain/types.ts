import type {
  ClubType,
  CompetitionCategory,
  SourceScope,
  SourceStatus,
} from "./enums";

export interface Region {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Prefecture {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  category: CompetitionCategory;
  parentCompetitionId: string | null;
  regionId: string | null;
  prefectureId: string | null;
  level: number | null;
  sortOrder: number;
  sourceId: string | null;
}

export interface Season {
  id: string;
  competitionId: string;
  year: number;
  name: string;
  status: string;
  sourceId: string | null;
}

export interface Club {
  id: string;
  name: string;
  shortName: string | null;
  prefectureId: string | null;
  type: ClubType;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  shortName: string | null;
  squadName: string | null;
}

export interface Standing {
  seasonId: string;
  competitionId: string;
  teamId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface SourceMetadata {
  sourceId: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  parserVersion: string | null;
}

export interface DataSourceDefinition {
  sourceId: string;
  name: string;
  scope: SourceScope;
  regionId: string | null;
  prefectureId: string | null;
  adapter: string;
  format: string;
  enabled: boolean;
  status: SourceStatus;
  /** Minutes between refreshes on a normal day. */
  updateIntervalMinutes: number;
  sourceUrl: string;
  notes: string | null;
}
