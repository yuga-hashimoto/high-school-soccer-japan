import type { CompetitionCategory, MatchStatus } from "@/domain/enums";
import { fetchText } from "../http";
import {
  clubSlug,
  normalizeName,
  parseJstDateTime,
  parseIntOrNull,
  splitTeamName,
  teamSlug,
} from "../normalize";
import type {
  CompetitionDTO,
  FetchContext,
  LeagueDataSource,
  MatchDTO,
  Sourced,
  SourceMeta,
  StandingDTO,
  TeamDTO,
} from "../types";

export const JFA_PARSER_VERSION = "jfa-json@1.0.0";
const JFA_ORIGIN = "https://www.jfa.jp";

interface JfaStandingTeam {
  rank?: string;
  teamName?: string;
  teamAbbreviatedName?: string;
  winPoint?: string;
  games?: string;
  win?: string;
  tie?: string;
  lost?: string;
  getScorePoint?: string;
  lostScorePoint?: string;
  getLostSum?: string;
}

interface JfaFightJson {
  matchStarMap?: { competitionName?: string; team?: Array<{ teamName?: string; teamAbbreviatedName?: string }> };
  competitionStanding?: { competitionName?: string; team?: JfaStandingTeam[] };
}

interface JfaScheduleEntry {
  matchTypeName?: string;
  matchNumber?: string;
  matchDate?: string;
  matchDateJpn?: string;
  matchTime?: string;
  venue?: string;
  venueFullName?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  score?: { homeScore?: string; awayScore?: string } | null;
  matchStatus?: string;
}

interface JfaScheduleJson {
  matchScheduleList?: { competitionName?: string; matchSchedule?: JfaScheduleEntry[] };
}

export interface JfaJsonSourceConfig {
  sourceId: string;
  sourceName: string;
  /** Seeded competition slug this endpoint feeds. */
  competitionSlug: string;
  competitionName: string;
  shortName?: string;
  category: CompetitionCategory;
  /** Absolute JFA path ending in "/", e.g. "/match/takamado_jfa_u18_premier2026/west/". */
  path: string;
  /** Human-facing page shown in the UI as the citation. */
  sourceUrl: string;
  seasonYear: number;
  regionSlug?: string | null;
  prefectureSlug?: string | null;
  notes?: string | null;
}

/**
 * Reads the official JFA league JSON (`match/fight.json` +
 * `match/schedule.json`). The same shape is used by the Premier league and by
 * every Prince league block, so one adapter covers the national tiers.
 */
export class JfaJsonAdapter implements LeagueDataSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly parserVersion = JFA_PARSER_VERSION;
  readonly config: JfaJsonSourceConfig;

  constructor(config: JfaJsonSourceConfig) {
    this.config = config;
    this.sourceId = config.sourceId;
    this.sourceName = config.sourceName;
    this.sourceUrl = config.sourceUrl;
  }

  get competitionSlug(): string {
    return this.config.competitionSlug;
  }

  private meta(fetchedAt: Date, url: string): SourceMeta {
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      sourceUrl: url,
      fetchedAt,
      parserVersion: this.parserVersion,
    };
  }

  private jsonUrl(file: "fight" | "schedule"): string {
    return `${JFA_ORIGIN}${this.config.path}match/${file}.json`;
  }

  private async loadJson<T>(file: "fight" | "schedule"): Promise<{
    json: T;
    source: SourceMeta;
  }> {
    const url = this.jsonUrl(file);
    const document = await fetchText(url, { sourceId: this.sourceId });
    try {
      return {
        json: JSON.parse(document.body) as T,
        source: this.meta(document.fetchedAt, url),
      };
    } catch {
      return {
        json: {} as T,
        source: this.meta(document.fetchedAt, url),
      };
    }
  }

  async getCompetitions(_ctx: FetchContext): Promise<Sourced<CompetitionDTO[]>> {
    const url = this.sourceUrl;
    return {
      data: [
        {
          slug: this.config.competitionSlug,
          name: this.config.competitionName,
          shortName: this.config.shortName ?? null,
          category: this.config.category,
          parentSlug: null,
        },
      ],
      source: this.meta(new Date(), url),
    };
  }

  async getTeams(_ctx: FetchContext): Promise<Sourced<TeamDTO[]>> {
    const { json, source } = await this.loadJson<JfaFightJson>("fight");
    const fullNames = new Map<string, string>();
    for (const team of json.matchStarMap?.team ?? []) {
      const abbreviated = team.teamAbbreviatedName ?? team.teamName;
      if (abbreviated && team.teamName) {
        fullNames.set(normalizeName(abbreviated), normalizeName(team.teamName));
      }
    }

    const teams = new Map<string, TeamDTO>();
    for (const row of json.competitionStanding?.team ?? []) {
      const abbreviated = normalizeName(
        row.teamAbbreviatedName ?? row.teamName ?? "",
      );
      if (!abbreviated) continue;
      const full = fullNames.get(abbreviated) ?? abbreviated;
      const { clubName, squadName } = splitTeamName(full);
      const dto: TeamDTO = {
        slug: teamSlug(full),
        name: full,
        clubSlug: clubSlug(clubName),
        clubName,
        shortName: abbreviated,
        squadName,
        prefectureSlug: this.config.prefectureSlug ?? null,
      };
      teams.set(dto.slug, dto);
    }

    return { data: [...teams.values()], source };
  }

  async getStandings(_ctx: FetchContext): Promise<Sourced<StandingDTO[]>> {
    const { json, source } = await this.loadJson<JfaFightJson>("fight");
    const fullNames = new Map<string, string>();
    for (const team of json.matchStarMap?.team ?? []) {
      const abbreviated = team.teamAbbreviatedName ?? team.teamName;
      if (abbreviated && team.teamName) {
        fullNames.set(normalizeName(abbreviated), normalizeName(team.teamName));
      }
    }

    const standings: StandingDTO[] = [];
    for (const row of json.competitionStanding?.team ?? []) {
      const abbreviated = normalizeName(
        row.teamAbbreviatedName ?? row.teamName ?? "",
      );
      if (!abbreviated) continue;
      const full = fullNames.get(abbreviated) ?? abbreviated;
      const goalsFor = parseIntOrNull(row.getScorePoint) ?? 0;
      const goalsAgainst = parseIntOrNull(row.lostScorePoint) ?? 0;
      standings.push({
        competitionSlug: this.config.competitionSlug,
        seasonYear: this.config.seasonYear,
        teamSlug: teamSlug(full),
        position: parseIntOrNull(row.rank) ?? 0,
        played: parseIntOrNull(row.games) ?? 0,
        won: parseIntOrNull(row.win) ?? 0,
        drawn: parseIntOrNull(row.tie) ?? 0,
        lost: parseIntOrNull(row.lost) ?? 0,
        goalsFor,
        goalsAgainst,
        goalDifference: parseIntOrNull(row.getLostSum) ?? goalsFor - goalsAgainst,
        points: parseIntOrNull(row.winPoint) ?? 0,
      });
    }

    return { data: standings, source };
  }

  async getMatches(_ctx: FetchContext): Promise<Sourced<MatchDTO[]>> {
    const { json, source } = await this.loadJson<JfaScheduleJson>("schedule");
    const matches: MatchDTO[] = [];

    for (const entry of json.matchScheduleList?.matchSchedule ?? []) {
      const homeName = normalizeName(entry.homeTeamName ?? "");
      const awayName = normalizeName(entry.awayTeamName ?? "");
      if (!homeName || !awayName) continue;

      const homeScore = parseIntOrNull(entry.score?.homeScore);
      const awayScore = parseIntOrNull(entry.score?.awayScore);
      const status = toMatchStatus(entry.matchStatus, homeScore, awayScore);

      matches.push({
        slug: entry.matchNumber ? `jfa-${entry.matchNumber}` : null,
        competitionSlug: this.config.competitionSlug,
        seasonYear: this.config.seasonYear,
        homeTeamSlug: teamSlug(homeName),
        awayTeamSlug: teamSlug(awayName),
        kickoffAt: parseJstDateTime(entry.matchDate, entry.matchTime),
        venue: entry.venueFullName ?? entry.venue ?? null,
        homeScore,
        awayScore,
        status,
        round: entry.matchTypeName ?? null,
      });
    }

    return { data: matches, source };
  }
}

function toMatchStatus(
  raw: string | undefined,
  homeScore: number | null,
  awayScore: number | null,
): MatchStatus {
  if (raw && raw.includes("中止")) return "CANCELLED";
  if (raw && raw.includes("延期")) return "POSTPONED";
  if (raw && raw.includes("終了")) return "FINISHED";
  if (homeScore !== null && awayScore !== null) return "FINISHED";
  if (raw && raw.includes("開催中")) return "LIVE";
  return "SCHEDULED";
}
