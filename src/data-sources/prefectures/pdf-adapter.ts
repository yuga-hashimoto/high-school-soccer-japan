import type { CompetitionCategory, MatchStatus } from "@/domain/enums";
import { fetchBuffer, fetchText } from "../http";
import {
  extractPdfLayout,
  extractPdfText,
  PDF_PARSER_VERSION,
} from "../parse/pdf";
import { extractPdfStandings, isPlausibleStandings } from "../parse/pdf-table";
import {
  clubSlug,
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
import type { PrefectureSourceConfig } from "./types";

const SCORE_RE = /(\d{1,3})\s*[-–ー−―—－−]\s*(\d{1,3})/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const DATE_RE = /(\d{1,2})\s*[\/月]\s*(\d{1,2})/;

interface ParsedLine {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  time: string | null;
  date: { month: number; day: number } | null;
  venue: string | null;
}

/**
 * Parses one extracted PDF line of the shape
 * `13:30 都市大塩尻 2 - 3 松本山雅2nd 信州グリーンフィールド`.
 * Lines without a score (future fixtures) are ignored, so the resulting
 * matches are always results.
 */
const VS_RE = new RegExp(
  "^(?:(\\d{1,2}:\\d{2})\\s+)?(.+?)\\s+(?:vs|VS|ｖｓ)\\s+(.+?)(?:\\s+(\\d{1,3})\\s*[-–ー−―—－−]\\s*(\\d{1,3}))?$",
);

/** Collapses the per-glyph spaces PDF extraction inserts in Japanese names. */
function tidyName(text: string): string {
  const trimmed = text.trim();
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }
  return trimmed.replace(/\s+/g, " ");
}

/**
 * Many associations publish `10:00 柳ヶ浦 vs 大分上野丘 5-0`: a fixture list
 * where the score sits after the away team, and only played matches have one.
 */
function parseVsLine(line: string): ParsedLine | null {
  const match = VS_RE.exec(line.trim());
  if (!match) return null;
  const home = tidyName(match[2] ?? "");
  const away = tidyName(match[3] ?? "");
  if (home.length < 2 || away.length < 2) return null;
  if (!match[4] || !match[5]) return null;
  const dateMatch = DATE_RE.exec(line);
  return {
    home,
    away,
    homeScore: Number.parseInt(match[4], 10),
    awayScore: Number.parseInt(match[5], 10),
    time: match[1] ?? null,
    date: dateMatch
      ? { month: Number.parseInt(dateMatch[1], 10), day: Number.parseInt(dateMatch[2], 10) }
      : null,
    venue: null,
  };
}

export function parsePdfMatchLine(line: string): ParsedLine | null {
  const vsParsed = parseVsLine(line);
  if (vsParsed) return vsParsed;

  const match = SCORE_RE.exec(line);
  if (!match) return null;

  const before = line.slice(0, match.index).trim();
  const after = line.slice(match.index + match[0].length).trim();
  if (!before || !after) return null;

  const beforeTokens = before.split(/\s+/).filter(Boolean);
  const afterTokens = after.split(/\s+/).filter(Boolean);
  if (beforeTokens.length === 0 || afterTokens.length === 0) return null;

  // Squad labels are sometimes separated by a space ("市立長野 2nd"), so a
  // bare token would be parsed as the team name. Re-join them.
  const SQUAD = /^(2nd|3rd|1st|[A-D]|セカンド|サード|ファースト)$/i;
  let homeIndex = beforeTokens.length - 1;
  let home = beforeTokens[homeIndex];
  if (SQUAD.test(home) && homeIndex >= 1) {
    home = `${beforeTokens[homeIndex - 1]} ${home}`;
    homeIndex -= 1;
  }

  let awayTokenCount = 1;
  let away = afterTokens[0];
  if (afterTokens.length >= 2 && SQUAD.test(afterTokens[1])) {
    away = `${away} ${afterTokens[1]}`;
    awayTokenCount = 2;
  }

  if (!home || !away) return null;
  if (/^[\d\s\-–ー−]+$/.test(home) || /^[\d\s\-–ー−]+$/.test(away)) return null;
  if (home.length < 2 || away.length < 2) return null;
  if (home === away) return null;

  const previous = beforeTokens[homeIndex - 1];
  const time = previous && TIME_RE.test(previous) ? previous : null;

  const dateMatch = DATE_RE.exec(line);
  const date = dateMatch
    ? { month: Number.parseInt(dateMatch[1], 10), day: Number.parseInt(dateMatch[2], 10) }
    : null;

  const venue =
    afterTokens.length > awayTokenCount
      ? afterTokens.slice(awayTokenCount).join(" ")
      : null;

  return {
    home: tidyName(home),
    away: tidyName(away),
    homeScore: Number.parseInt(match[1], 10),
    awayScore: Number.parseInt(match[2], 10),
    time,
    date,
    venue: venue && venue.length > 1 ? venue : null,
  };
}

function kickoffFrom(
  date: ParsedLine["date"],
  time: string | null,
  seasonYear: number,
): Date | null {
  if (!date) return null;
  const [hh, mm] = (time ?? "00:00").split(":").map((p) => Number.parseInt(p, 10));
  const parsed = new Date(
    `${seasonYear}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(
      2,
      "0",
    )}T${String(hh || 0).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00+09:00`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * A PDF sometimes holds two tables for the same division (前期 / 後期). Their
 * team sets overlap, so the season table is the sum of both. Tables with
 * different team sets are separate groups and are left apart.
 */
function mergePhaseSections(
  sections: Array<{ label: string | null; rows: import("../parse/pdf-table").PdfStandingRow[]; columns: string[] }>,
) {
  const result: typeof sections = [];
  for (const section of sections) {
    const names = new Set(section.rows.map((row) => row.teamName));
    const target = result.find((candidate) => {
      const existing = new Set(candidate.rows.map((row) => row.teamName));
      let shared = 0;
      for (const name of names) if (existing.has(name)) shared += 1;
      const ratio = shared / Math.max(1, Math.min(names.size, existing.size));
      return ratio >= 0.5;
    });
    if (!target) {
      result.push({
        label: section.label,
        columns: section.columns,
        rows: section.rows.map((row) => ({ ...row })),
      });
      continue;
    }
    const byName = new Map(target.rows.map((row) => [row.teamName, row]));
    for (const row of section.rows) {
      const existing = byName.get(row.teamName);
      if (!existing) {
        target.rows.push({ ...row });
        continue;
      }
      const add = (a: number | null, b: number | null) =>
        a === null && b === null ? null : (a ?? 0) + (b ?? 0);
      existing.played = add(existing.played, row.played);
      existing.won = add(existing.won, row.won);
      existing.drawn = add(existing.drawn, row.drawn);
      existing.lost = add(existing.lost, row.lost);
      existing.goalsFor = add(existing.goalsFor, row.goalsFor);
      existing.goalsAgainst = add(existing.goalsAgainst, row.goalsAgainst);
      existing.goalDifference = add(existing.goalDifference, row.goalDifference);
      existing.points += row.points;
    }
  }
  // Re-rank the merged sections.
  for (const section of result) {
    [...section.rows]
      .sort(
        (a, b) =>
          b.points - a.points ||
          (b.goalDifference ?? 0) - (a.goalDifference ?? 0) ||
          (b.goalsFor ?? 0) - (a.goalsFor ?? 0),
      )
      .forEach((row, index) => {
        row.position = index + 1;
      });
  }
  return result;
}

interface PdfBlock {
  fetchedAt: Date;
  url: string;
  lines: ParsedLine[];
}

/**
 * Adapter for associations that publish the league as a results PDF. Only the
 * embedded text layer is read (no OCR). Standings are not taken from the PDF —
 * they are derived from the parsed results by the read layer, which keeps the
 * 星取表 layouts out of the parser entirely.
 */
export class PrefecturePdfAdapter implements LeagueDataSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly parserVersion = PDF_PARSER_VERSION;
  readonly config: PrefectureSourceConfig;
  private readonly cache = new Map<string, Promise<PdfBlock>>();
  private readonly category: CompetitionCategory = "PREFECTURE";

  constructor(config: PrefectureSourceConfig) {
    this.config = config;
    this.sourceId = config.sourceId;
    this.sourceName = config.name;
    this.sourceUrl = config.sourceUrl;
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

  /**
   * Accepts either a direct .pdf URL or an HTML page to discover the current
   * PDF from. Associations rename the file every update (e.g. `..._1-9.pdf`),
   * so discovery keeps the source working without editing the catalog.
   */
  private async resolvePdfUrl(endpoint: {
    matchesUrl?: string;
    pdfLinkPattern?: string;
    pdfLinkText?: string;
    pdfSelection?: "newest" | "mostMatches";
    headers?: Record<string, string>;
  }): Promise<string> {
    const url = endpoint.matchesUrl as string;
    if (/\.pdf(\?|$)/i.test(url)) return url;

    const page = await fetchText(url, {
      sourceId: this.sourceId,
      headers: endpoint.headers,
    });
    const anchors = [...page.body.matchAll(/<a\s[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(
      (match) => ({
        href: new URL(match[1], url).toString(),
        text: match[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(),
      }),
    );
    const seenHref = new Set<string>();
    let candidates = anchors.filter((anchor) => {
      if (seenHref.has(anchor.href)) return false;
      seenHref.add(anchor.href);
      return true;
    });
    if (endpoint.pdfLinkPattern) {
      const pattern = new RegExp(endpoint.pdfLinkPattern);
      candidates = candidates.filter((anchor) =>
        pattern.test(decodeURIComponent(anchor.href)),
      );
    }
    if (endpoint.pdfLinkText) {
      const pattern = new RegExp(endpoint.pdfLinkText);
      candidates = candidates.filter((anchor) => pattern.test(anchor.text));
    }
    const filtered = candidates.map((anchor) => anchor.href);
    if (filtered.length === 0) {
      throw new NeedsParserError(
        this.sourceId,
        url,
        "ページ内にPDFリンクが見つかりませんでした",
      );
    }
    if (endpoint.pdfSelection === "mostMatches") {
      let best: { url: string; rows: number } | null = null;
      for (const link of filtered.slice(0, 12)) {
        try {
          const block = await this.parse(link);
          const rows = block.lines.length;
          if (rows > 0 && (!best || rows > best.rows)) best = { url: link, rows };
        } catch {
          // A scanned or unrelated PDF is simply not a candidate.
        }
      }
      if (best) return best.url;
      throw new NeedsParserError(
        this.sourceId,
        url,
        "試合結果を読み取れるPDFが見つかりませんでした",
      );
    }

    // Prefer the newest revision: associations bump a trailing number
    // (e.g. `..._1-9.pdf` -> `..._1-11.pdf`) instead of using dates.
    const version = (link: string): number => {
      const base = decodeURIComponent(link.split("/").pop() ?? "");
      const numbers = base.match(/\d+/g);
      if (!numbers || numbers.length === 0) return 0;
      return Number.parseInt(numbers[numbers.length - 1], 10) || 0;
    };
    return [...filtered].sort((a, b) => version(b) - version(a))[0];
  }

  private async parse(
    url: string,
    lineFilter?: string,
    headers?: Record<string, string>,
  ): Promise<PdfBlock> {
    const document = await fetchBuffer(url, { sourceId: this.sourceId, headers });
    const text = await extractPdfText(document.bytes, this.sourceId, url);
    const filter = lineFilter ? new RegExp(lineFilter) : null;
    const lines: ParsedLine[] = [];
    for (const raw of text.split("\n")) {
      if (filter && !filter.test(raw)) continue;
      const parsed = parsePdfMatchLine(raw);
      if (parsed) lines.push(parsed);
    }
    return { fetchedAt: document.fetchedAt, url, lines };
  }

  private load(endpoint: {
    matchesUrl?: string;
    pdfLinkPattern?: string;
    pdfSelection?: "newest" | "mostMatches";
    lineFilter?: string;
    headers?: Record<string, string>;
  }): Promise<PdfBlock> {
    const key = `${endpoint.matchesUrl as string}|${endpoint.pdfLinkPattern ?? ""}|${
      endpoint.pdfSelection ?? ""
    }|${endpoint.lineFilter ?? ""}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    const promise = (async (): Promise<PdfBlock> => {
      const url = await this.resolvePdfUrl(endpoint);
      return this.parse(url, endpoint.lineFilter, endpoint.headers);
    })();
    this.cache.set(key, promise);
    return promise;
  }

  private endpoints() {
    return (this.config.endpoints ?? []).filter(
      (endpoint) => endpoint.matchesUrl && !endpoint.pdfTable,
    );
  }

  private tableEndpoints() {
    return (this.config.endpoints ?? []).filter((endpoint) => endpoint.pdfTable);
  }

  private layoutCache = new Map<string, ReturnType<typeof extractPdfStandings>>();

  /** Published standings tables read from a PDF's text layer. */
  private async loadStandingsTables(endpoint: {
    standingsUrl?: string;
    matchesUrl?: string;
    pdfLinkPattern?: string;
    pdfSelection?: "newest" | "mostMatches";
    sectionFilter?: string;
    sectionIndex?: number;
    pdfLinkText?: string;
    headers?: Record<string, string>;
  }) {
    const source = endpoint.standingsUrl ?? endpoint.matchesUrl;
    if (!source) return [];
    const cacheKey = `${source}|${endpoint.pdfLinkPattern ?? ""}|${
      endpoint.pdfLinkText ?? ""
    }|${endpoint.sectionFilter ?? ""}`;
    const cached = this.layoutCache.get(cacheKey);
    if (cached) return cached;

    const url = await this.resolvePdfUrl({ ...endpoint, matchesUrl: source });
    const document = await fetchBuffer(url, {
      sourceId: this.sourceId,
      headers: endpoint.headers,
    });
    const items = await extractPdfLayout(document.bytes, this.sourceId, url);
    const sections = extractPdfStandings(items).filter(isPlausibleStandings);
    const filter = endpoint.sectionFilter
      ? new RegExp(endpoint.sectionFilter)
      : null;
    const chosen = filter
      ? sections.filter((section) => section.label && filter.test(section.label))
      : sections;
    this.layoutCache.set(cacheKey, chosen);
    return chosen;
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
        category: this.category,
        parentSlug: competition.parentSlug ?? null,
        level: competition.level,
        sortOrder: competition.sortOrder ?? 0,
      })),
      source: this.meta(new Date(), this.sourceUrl),
    };
  }

  async getTeams(_ctx: FetchContext): Promise<Sourced<TeamDTO[]>> {
    const teams = new Map<string, TeamDTO>();
    let fetchedAt = new Date();
    let lastUrl = this.sourceUrl;

    for (const endpoint of this.tableEndpoints()) {
      const sections = await this.loadStandingsTables(endpoint);
      for (const section of sections) {
        for (const row of section.rows) {
          const { clubName, squadName } = splitTeamName(row.teamName);
          teams.set(teamSlug(row.teamName), {
            slug: teamSlug(row.teamName),
            name: row.teamName,
            clubSlug: clubSlug(clubName),
            clubName,
            squadName,
            prefectureSlug: this.config.prefectureSlug,
          });
        }
      }
    }

    for (const endpoint of this.endpoints()) {
      const block = await this.load(endpoint);
      fetchedAt = block.fetchedAt;
      lastUrl = block.url;
      for (const line of block.lines) {
        for (const name of [line.home, line.away]) {
          const { clubName, squadName } = splitTeamName(name);
          const dto: TeamDTO = {
            slug: teamSlug(name),
            name,
            clubSlug: clubSlug(clubName),
            clubName,
            squadName,
            prefectureSlug: this.config.prefectureSlug,
          };
          teams.set(dto.slug, dto);
        }
      }
    }

    return { data: [...teams.values()], source: this.meta(fetchedAt, lastUrl) };
  }

  async getMatches(ctx: FetchContext): Promise<Sourced<MatchDTO[]>> {
    const endpoints = this.endpoints();
    // A source may publish only a standings table; nothing to read for matches.
    if (endpoints.length === 0 && this.tableEndpoints().length > 0) {
      return { data: [], source: this.meta(new Date(), this.sourceUrl) };
    }
    if (endpoints.length === 0) {
      throw new NeedsParserError(
        this.sourceId,
        this.sourceUrl,
        "PDFのURLが登録されていません",
      );
    }

    const matches: MatchDTO[] = [];
    let fetchedAt = new Date();
    let lastUrl = this.sourceUrl;

    for (const endpoint of endpoints) {
      const block = await this.load(endpoint);
      fetchedAt = block.fetchedAt;
      lastUrl = block.url;
      for (const line of block.lines) {
        const status: MatchStatus = "FINISHED";
        matches.push({
          competitionSlug: endpoint.competitionSlug,
          seasonYear: ctx.seasonYear,
          homeTeamSlug: teamSlug(line.home),
          awayTeamSlug: teamSlug(line.away),
          kickoffAt: kickoffFrom(line.date, line.time, ctx.seasonYear),
          venue: line.venue,
          homeScore: parseIntOrNull(line.homeScore),
          awayScore: parseIntOrNull(line.awayScore),
          status,
          round: null,
        });
      }
    }

    return { data: matches, source: this.meta(fetchedAt, lastUrl) };
  }

  async getStandings(ctx: FetchContext): Promise<Sourced<StandingDTO[]>> {
    const tableEndpoints = this.tableEndpoints();
    if (tableEndpoints.length === 0) {
      // Result lists carry no table; the read layer derives standings instead.
      return { data: [], source: this.meta(new Date(), this.sourceUrl) };
    }

    const rows: StandingDTO[] = [];
    let fetchedAt = new Date();
    const lastUrl = this.sourceUrl;

    for (const endpoint of tableEndpoints) {
      const loaded = await this.loadStandingsTables(endpoint);
      let sections = mergePhaseSections(loaded);
      if (endpoint.sectionIndex !== undefined) {
        const picked = sections[endpoint.sectionIndex];
        sections = picked ? [picked] : [];
      }
      for (const section of sections) {
        for (const row of section.rows) {
          rows.push({
            competitionSlug: endpoint.competitionSlug,
            seasonYear: ctx.seasonYear,
            teamSlug: teamSlug(row.teamName),
            position: row.position ?? 0,
            played: row.played ?? 0,
            won: row.won ?? 0,
            drawn: row.drawn ?? 0,
            lost: row.lost ?? 0,
            goalsFor: row.goalsFor ?? 0,
            goalsAgainst: row.goalsAgainst ?? 0,
            goalDifference: row.goalDifference ?? 0,
            points: row.points,
          });
        }
      }
      fetchedAt = new Date();
    }

    return { data: rows, source: this.meta(fetchedAt, lastUrl) };
  }
}
