import { NeedsParserError } from "./errors";
import type {
  CompetitionDTO,
  FetchContext,
  LeagueDataSource,
  MatchDTO,
  Sourced,
  StandingDTO,
  TeamDTO,
} from "./types";

export interface UnavailableSourceOptions {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  reason: string;
}

/**
 * Placeholder adapter for sources that are registered but cannot be parsed
 * yet. It always fails with `NeedsParserError`, which the runner records as
 * `NEEDS_PARSER` — the point is that missing coverage is visible, not silent.
 */
export class UnavailableAdapter implements LeagueDataSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly parserVersion = "unavailable@0.0.1";
  readonly reason: string;

  constructor(options: UnavailableSourceOptions) {
    this.sourceId = options.sourceId;
    this.sourceName = options.sourceName;
    this.sourceUrl = options.sourceUrl;
    this.reason = options.reason;
  }

  private fail(): never {
    throw new NeedsParserError(this.sourceId, this.sourceUrl, this.reason);
  }

  async getCompetitions(_ctx: FetchContext): Promise<Sourced<CompetitionDTO[]>> {
    return this.fail();
  }

  async getTeams(_ctx: FetchContext): Promise<Sourced<TeamDTO[]>> {
    return this.fail();
  }

  async getMatches(_ctx: FetchContext): Promise<Sourced<MatchDTO[]>> {
    return this.fail();
  }

  async getStandings(_ctx: FetchContext): Promise<Sourced<StandingDTO[]>> {
    return this.fail();
  }
}
