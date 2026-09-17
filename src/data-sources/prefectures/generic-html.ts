import type { CompetitionCategory, MatchStatus } from "@/domain/enums";
import { fetchText } from "../http";
import {
  extractTables,
  findTable,
  isHeaderRow,
  toNumber,
} from "../parse/html";
import {
  extractMatrixSections,
  parseStarTables,
  type MatrixMatch,
} from "../parse/matrix";
import {
  clubSlug,
  normalizeName,
  parseMonthDay,
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
import { NeedsParserError } from "../errors";
import { UnavailableAdapter } from "../unavailable";
import type { PrefectureSourceConfig } from "./types";

export const PREFECTURE_PARSER_VERSION = "prefecture-html@1.0.0";

export function inferClubType(name: string): "SCHOOL" | "CLUB" {
  return /U-?18|ユース|ジュニアユース|アカデミー/i.test(name) ? "CLUB" : "SCHOOL";
}

interface ColumnLookup {
  position: number;
  team: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

const HEADER_PATTERNS: Record<keyof ColumnLookup, RegExp> = {
  position: /順位|順番|^#$/,
  team: /チーム|学校|クラブ|チーム名/,
  points: /勝点|勝ち点|勝点合計|ポイント/,
  played: /試合数|試合|消化/,
  won: /勝数|^勝$|勝利/,
  drawn: /引分|引分数|^分$|ドロー/,
  lost: /敗数|敗戦|^敗$|黒星/,
  goalsFor: /^得点$|総得点|得点合計/,
  goalsAgainst: /^失点$|総失点|失点合計/,
  goalDifference: /得失|得失点差/,
};

function buildColumnLookup(header: string[]): ColumnLookup | null {
  const lookup: Partial<ColumnLookup> = {};
  header.forEach((cell, index) => {
    const text = cell.replace(/\s+/g, "");
    for (const [key, pattern] of Object.entries(HEADER_PATTERNS) as Array<
      [keyof ColumnLookup, RegExp]
    >) {
      if (lookup[key] === undefined && pattern.test(text)) {
        lookup[key] = index;
      }
    }
  });

  // Matrix (星取表) standings list the team on the row label and often omit
  // both the チーム and 順位 headers, so fall back to column 0 for the team and
  // derive the position from points if the source does not publish one.
  const team = lookup.team ?? 0;
  const hasPoints = lookup.points !== undefined;
  if (lookup.position === undefined && !hasPoints) return null;

  return {
    position: lookup.position ?? -1,
    team,
    points: lookup.points ?? -1,
    played: lookup.played ?? -1,
    won: lookup.won ?? -1,
    drawn: lookup.drawn ?? -1,
    lost: lookup.lost ?? -1,
    goalsFor: lookup.goalsFor ?? -1,
    goalsAgainst: lookup.goalsAgainst ?? -1,
    goalDifference: lookup.goalDifference ?? -1,
  };
}

function cell(cells: string[], index: number): string {
  if (index < 0) return "";
  return cells[index] ?? "";
}

function findStandingsTable(html: string) {
  const direct = findTable(html, ["順位", "勝点", "チーム"]);
  if (direct && direct.headers.length > 0) return direct;
  // 星取表 style: the header names the ranking columns but not チーム/順位.
  for (const table of extractTables(html)) {
    if (table.headers.length === 0) continue;
    if (!buildColumnLookup(table.headers)) continue;
    if (table.rows.length < 3) continue;
    return table;
  }
  return null;
}

/**
 * Collects candidate match rows from every table on the page. Match tables are
 * identified by their content (a score cell between two team cells) rather than
 * by header keywords, because associations label those columns inconsistently.
 */
function findMatchRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const table of extractTables(html)) {
    const header = table.headers.join(" ");
    if (/順位|勝点|勝ち点|得失/.test(header)) continue;
    for (const row of table.rows) {
      if (isHeaderRow(row)) continue;
      if (row.some((value) => /\d+\s*[-–ー]\s*\d+/.test(value.replace(/&nbsp;/g, " ")))) {
        rows.push(row);
      }
    }
  }
  return rows;
}

/**
 * Generic adapter for prefecture association pages that publish HTML tables.
 * Columns are resolved from the table header, so a source only has to supply
 * URLs once its page structure is known.
 */
export class PrefectureHtmlAdapter implements LeagueDataSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly parserVersion = PREFECTURE_PARSER_VERSION;
  readonly config: PrefectureSourceConfig;
  private readonly category: CompetitionCategory = "PREFECTURE";

  constructor(config: PrefectureSourceConfig) {
    this.config = config;
    this.sourceId = config.sourceId;
    this.sourceName = config.name;
    this.sourceUrl = config.sourceUrl;
  }

  /**
   * Matrix matches for one endpoint. Each table is parsed separately and its
   * heading becomes the round label, so 前期/後期 legs of the same pairing do
   * not collapse into one record.
   */
  private matrixMatches(
    html: string,
    sectionFilter: string | undefined,
  ): { matches: Array<MatrixMatch & { round: string | null }>; teams: string[] } | null {
    const sections = extractMatrixSections(html);
    const filter = sectionFilter ? new RegExp(sectionFilter) : null;
    const applicable = filter
      ? sections.filter((section) => filter.test(section.heading))
      : sections;
    const chosen = applicable.length > 0 ? applicable : sections;

    // Decide how to read the matrix across the whole division (a mirrored
    // table must be read once, a true home/away matrix twice), then emit each
    // table's matches with its own round label so legs do not collapse.
    const decision = parseStarTables(chosen.map((section) => section.table));
    if (!decision) return null;

    const matches: Array<MatrixMatch & { round: string | null }> = [];
    const teams = new Set<string>();
    for (const section of chosen) {
      const parsed = parseStarTables([section.table]);
      if (!parsed) continue;
      for (const team of parsed.teams) teams.add(team);
      const labels = section.heading.match(/[^\s]*(?:部|節)[^\s]*/g);
      const round = labels && labels.length > 0 ? labels[labels.length - 1] : null;
      const source =
        decision.interpretation === "upper" ? parsed.upperMatches : parsed.matches;
      for (const match of source) matches.push({ ...match, round });
    }
    if (matches.length === 0) return null;
    return { matches, teams: [...teams] };
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

  async getCompetitions(_ctx: FetchContext): Promise<Sourced<CompetitionDTO[]>> {
    if (this.config.competitions.length === 0) {
      throw new NeedsParserError(
        this.sourceId,
        this.sourceUrl,
        "competition structure is not registered for this prefecture",
      );
    }
    return {
      data: this.config.competitions.map((competition) => ({
        slug: competition.slug,
        name: competition.name,
        shortName: null,
        category: competition.parentSlug ? this.category : "PREFECTURE",
        parentSlug: competition.parentSlug ?? null,
        level: competition.level,
        sortOrder: competition.sortOrder ?? 0,
      })),
      source: this.meta(new Date(), this.sourceUrl),
    };
  }

  async getTeams(ctx: FetchContext): Promise<Sourced<TeamDTO[]>> {
    const matrixEndpoints = (this.config.endpoints ?? []).filter(
      (endpoint) => endpoint.matrix && endpoint.standingsUrl,
    );
    if (matrixEndpoints.length > 0) {
      const teams = new Map<string, TeamDTO>();
      let fetchedAt = new Date();
      let lastUrl = this.sourceUrl;
      for (const endpoint of matrixEndpoints) {
        const document = await fetchText(endpoint.standingsUrl as string, {
          sourceId: this.sourceId,
        });
        fetchedAt = document.fetchedAt;
        lastUrl = endpoint.standingsUrl as string;
        const parsed = this.matrixMatches(document.body, endpoint.sectionFilter);
        if (!parsed) continue;
        for (const name of parsed.teams) {
          const { clubName, squadName } = splitTeamName(name);
          teams.set(teamSlug(name), {
            slug: teamSlug(name),
            name,
            clubSlug: clubSlug(clubName),
            clubName,
            squadName,
            prefectureSlug: this.config.prefectureSlug,
          });
        }
      }
      return { data: [...teams.values()], source: this.meta(fetchedAt, lastUrl) };
    }

    const { data: standings, source } = await this.getStandings(ctx);
    const teams = new Map<string, TeamDTO>();
    for (const row of standings) {
      const name = row.teamName;
      if (!name) continue;
      const { clubName, squadName } = splitTeamName(name);
      const dto: TeamDTO = {
        slug: row.teamSlug,
        name,
        clubSlug: clubSlug(clubName),
        clubName,
        squadName,
        prefectureSlug: this.config.prefectureSlug,
      };
      teams.set(dto.slug, dto);
    }
    return { data: [...teams.values()], source };
  }

  async getStandings(ctx: FetchContext): Promise<Sourced<(StandingDTO & { teamName: string })[]>> {
    const endpoints = this.config.endpoints ?? [];
    if (endpoints.length === 0) {
      throw new NeedsParserError(
        this.sourceId,
        this.sourceUrl,
        "no standings endpoint is configured for this prefecture",
      );
    }

    const collected: Array<StandingDTO & { teamName: string }> = [];
    let source = this.meta(new Date(), this.sourceUrl);

    for (const endpoint of endpoints) {
      if (!endpoint.standingsUrl) continue;
      // Matrix sources publish no table; standings are derived from matches.
      if (endpoint.matrix) continue;
      const document = await fetchText(endpoint.standingsUrl, {
        sourceId: this.sourceId,
      });
      source = this.meta(document.fetchedAt, endpoint.standingsUrl);

      const table = findStandingsTable(document.body);
      if (!table || table.headers.length === 0) continue;

      const lookup = buildColumnLookup(table.headers);
      if (!lookup) continue;

      const block: Array<StandingDTO & { teamName: string }> = [];
      for (const row of table.rows) {
        if (isHeaderRow(row)) continue;
        const name = normalizeName(cell(row, lookup.team));
        if (!name) continue;
        const goalsFor = toNumber(cell(row, lookup.goalsFor));
        const goalsAgainst = toNumber(cell(row, lookup.goalsAgainst));
        block.push({
          competitionSlug: endpoint.competitionSlug,
          seasonYear: ctx.seasonYear,
          teamSlug: teamSlug(name),
          teamName: name,
          position: toNumber(cell(row, lookup.position)),
          played: toNumber(cell(row, lookup.played)),
          won: toNumber(cell(row, lookup.won)),
          drawn: toNumber(cell(row, lookup.drawn)),
          lost: toNumber(cell(row, lookup.lost)),
          goalsFor,
          goalsAgainst,
          goalDifference:
            lookup.goalDifference >= 0
              ? toNumber(cell(row, lookup.goalDifference))
              : goalsFor - goalsAgainst,
          points: toNumber(cell(row, lookup.points)),
        });
      }

      // Sources that publish a 星取表 without a 順位 column still have points,
      // so rank them the same way the competition would.
      if (lookup.position < 0) {
        block.sort(
          (a, b) =>
            b.points - a.points ||
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor,
        );
        block.forEach((row, index) => {
          row.position = index + 1;
        });
      }
      collected.push(...block);
    }

    return { data: collected, source };
  }

  async getMatches(ctx: FetchContext): Promise<Sourced<MatchDTO[]>> {
    const endpoints = this.config.endpoints ?? [];
    const matches: MatchDTO[] = [];
    let source = this.meta(new Date(), this.sourceUrl);

    for (const endpoint of endpoints) {
      const url = endpoint.matchesUrl ?? (endpoint.matrix ? endpoint.standingsUrl : undefined);
      if (!url) continue;
      const document = await fetchText(url, { sourceId: this.sourceId });
      source = this.meta(document.fetchedAt, url);

      if (endpoint.matrix) {
        const parsed = this.matrixMatches(document.body, endpoint.sectionFilter);
        if (!parsed) continue;
        for (const match of parsed.matches) {
          matches.push({
            competitionSlug: endpoint.competitionSlug,
            seasonYear: ctx.seasonYear,
            homeTeamSlug: teamSlug(match.home),
            awayTeamSlug: teamSlug(match.away),
            kickoffAt: null,
            venue: null,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            status: "FINISHED",
            round: match.round,
          });
        }
        continue;
      }

      for (const row of findMatchRows(document.body)) {
        const match = this.parseMatchRow(row, endpoint.competitionSlug, ctx.seasonYear);
        if (match) matches.push(match);
      }
    }

    return { data: matches, source };
  }

  /**
   * Match rows vary a lot between associations. This handles the common
   * `date | home | score | away | venue` layout and the `home | score | away`
   * layout, returning null for rows it cannot interpret so one odd row does
   * not discard the whole table.
   */
  protected parseMatchRow(
    row: string[],
    competitionSlug: string,
    seasonYear: number,
  ): MatchDTO | null {
    const scoreIndex = row.findIndex((cellValue) =>
      /\d+\s*[-–ー]\s*\d+/.test(cellValue.replace(/&nbsp;/g, " ")),
    );
    if (scoreIndex <= 0 || scoreIndex >= row.length - 1) return null;

    const home = normalizeName(row[scoreIndex - 1] ?? "");
    const away = normalizeName(row[scoreIndex + 1] ?? "");
    if (!home || !away) return null;
    if (isHeaderRow([home, away])) return null;

    const scoreCell = (row[scoreIndex] ?? "").replace(/&nbsp;/g, " ").replace(/\u3000/g, " ");
    const scoreMatch = scoreCell.match(/(\d+)\s*[-–ー]\s*(\d+)/);
    if (!scoreMatch) return null;

    const dateCell = row
      .slice(0, scoreIndex - 1)
      .find((value) => /\d{1,2}\/\d{1,2}/.test(value));
    const kickoffAt = dateCell ? parseMonthDay(dateCell, seasonYear) : null;

    const venue = row[row.length - 1] ?? null;
    const finished = /試合終了|終了|FT/.test(scoreCell);
    const status: MatchStatus = finished ? "FINISHED" : "SCHEDULED";

    return {
      competitionSlug,
      seasonYear,
      homeTeamSlug: teamSlug(home),
      awayTeamSlug: teamSlug(away),
      kickoffAt,
      venue,
      homeScore: parseIntOrNull(scoreMatch[1]),
      awayScore: parseIntOrNull(scoreMatch[2]),
      status,
      round: row[0] && /^\d+$/.test(row[0].trim()) ? row[0].trim() : null,
    };
  }
}

/** Adapter stub for sources that are registered but not yet parsed. */
export class NeedsParserAdapter extends UnavailableAdapter {
  constructor(config: PrefectureSourceConfig) {
    super({
      sourceId: config.sourceId,
      sourceName: config.name,
      sourceUrl: config.sourceUrl,
      reason:
        config.notes ??
        "official page is registered but a parser has not been implemented yet",
    });
  }
}
