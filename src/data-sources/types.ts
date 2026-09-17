import type {
  ClubType,
  CompetitionCategory,
  MatchStatus,
  SourceFormat,
  SourceScope,
  SourceStatus,
} from "@/domain/enums";

/** Provenance attached to every record that leaves an adapter. */
export interface SourceMeta {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: Date;
  parserVersion: string;
}

export interface Sourced<T> {
  data: T;
  source: SourceMeta;
}

export interface CompetitionDTO {
  slug: string;
  name: string;
  shortName?: string | null;
  category: CompetitionCategory;
  parentSlug?: string | null;
  level?: number | null;
  sortOrder?: number;
}

export interface TeamDTO {
  slug: string;
  name: string;
  clubSlug?: string | null;
  clubName?: string | null;
  shortName?: string | null;
  squadName?: string | null;
  prefectureSlug?: string | null;
  clubType?: ClubType;
}

export interface MatchDTO {
  slug?: string | null;
  competitionSlug: string;
  seasonYear: number;
  homeTeamSlug: string;
  awayTeamSlug: string;
  kickoffAt?: Date | null;
  venue?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus;
  round?: string | null;
}

export interface StandingDTO {
  competitionSlug: string;
  seasonYear: number;
  teamSlug: string;
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

export interface SeasonDTO {
  competitionSlug: string;
  year: number;
  name: string;
  status: string;
}

export interface FetchContext {
  seasonYear: number;
  signal?: AbortSignal;
}

/**
 * The single interface every data source normalises to. A source may produce
 * HTML, JSON, CSV or PDF internally — the application only ever sees these
 * shapes.
 */
export interface LeagueDataSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly parserVersion: string;
  getCompetitions(ctx: FetchContext): Promise<Sourced<CompetitionDTO[]>>;
  getTeams(ctx: FetchContext): Promise<Sourced<TeamDTO[]>>;
  getMatches(ctx: FetchContext): Promise<Sourced<MatchDTO[]>>;
  getStandings(ctx: FetchContext): Promise<Sourced<StandingDTO[]>>;
}

export interface DataSourceRegistryEntry {
  sourceId: string;
  name: string;
  scope: SourceScope;
  regionSlug: string | null;
  prefectureSlug: string | null;
  sourceUrl: string;
  format: SourceFormat;
  status: SourceStatus;
  enabled: boolean;
  updateIntervalMinutes: number;
  adapter: string;
  notes: string | null;
  adapterInstance: LeagueDataSource | null;
}
