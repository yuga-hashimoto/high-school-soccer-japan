import { extractTables, type ParsedTable } from "./html";

/**
 * Splits a document into the text preceding each table plus the table itself,
 * so a page holding several divisions can be filtered by its headings.
 */
export function extractMatrixSections(
  html: string,
): Array<{ heading: string; table: ParsedTable }> {
  const sections: Array<{ heading: string; table: ParsedTable }> = [];
  const matches = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)];
  for (const match of matches) {
    const start = match.index ?? 0;
    const preceding = html.slice(Math.max(0, start - 800), start);
    const heading = preceding
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const parsed = extractTables(match[0]);
    if (parsed.length === 0) continue;
    sections.push({ heading, table: parsed[0] });
  }
  return sections;
}

export interface MatrixMatch {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface MatrixParseResult {
  matches: MatrixMatch[];
  /** Only the cells above the diagonal, used when a table mirrors one match. */
  upperMatches: MatrixMatch[];
  teams: string[];
  /** Which interpretation matched the published table. */
  interpretation: "all" | "upper";
  /** Teams for which the published 勝点 agreed with the derived total. */
  agreement: number;
  publishedPoints: Map<string, number>;
}

const LEGEND = /^[○●△◯×]$/;
const AGGREGATE =
  /勝点|勝ち点|試合数|勝数|引分|敗数|^勝$|^分$|^敗$|得点|失点|得失|順位|^FPP$/;

function normalizeCell(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** `○3 - 1` / `●1-2` / `△1 - 1` -> [3, 1]; `--` / `-` / `` -> null. */
export function parseMatrixCell(cell: string): [number, number] | null {
  const text = normalizeCell(cell);
  if (text.length === 0) return null;
  // Legend marks may be prefixed per number (`○3 ●1`) or per cell; strip them.
  const cleaned = text.replace(/[○●△◯×]/g, " ");
  const match = cleaned.match(/(\d{1,3})\s*[-–ー−―—－−]\s*(\d{1,3})/);
  if (!match) return null;
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)];
}

interface Layout {
  teamColumns: Array<{ index: number; name: string }>;
  pointsColumn: number;
  playedColumn: number;
}

function findLayout(header: string[]): Layout | null {
  if (header.length < 3) return null;
  let firstAggregate = header.length;
  for (let i = 1; i < header.length; i += 1) {
    const cell = normalizeCell(header[i]);
    if (cell.length === 0) continue;
    if (LEGEND.test(cell) || AGGREGATE.test(cell)) {
      firstAggregate = i;
      break;
    }
  }
  if (firstAggregate < 3) return null;

  const teamColumns: Array<{ index: number; name: string }> = [];
  for (let i = 1; i < firstAggregate; i += 1) {
    const name = normalizeCell(header[i]);
    if (name.length > 0) teamColumns.push({ index: i, name });
  }
  if (teamColumns.length < 3) return null;

  const find = (pattern: RegExp) =>
    header.findIndex((cell) => pattern.test(normalizeCell(cell)));
  return {
    teamColumns,
    pointsColumn: find(/勝点|勝ち点/),
    playedColumn: find(/試合数/),
  };
}

function isRowTeam(cell: string): boolean {
  const text = normalizeCell(cell);
  return text.length > 0 && !parseMatrixCell(text) && !LEGEND.test(text);
}

/**
 * Reads a 星取表 (cross results table).
 *
 * A 星取表 fills both triangles when home and away legs are both played, but
 * some associations mirror a single match in both triangles. To tell the two
 * apart, both interpretations are derived and compared against the published
 * 勝点 column; the one that agrees wins. That keeps us from doubling or halving
 * a team's points.
 */
export function parseStarTables(tables: ParsedTable[]): MatrixParseResult | null {
  const usable = tables
    .map((table) => ({
      layout: findLayout(table.headers),
      rows: table.rows,
    }))
    .filter(
      (entry): entry is { layout: Layout; rows: string[][] } => entry.layout !== null,
    );
  if (usable.length === 0) return null;

  const allMatches: MatrixMatch[] = [];
  const upperMatches: MatrixMatch[] = [];
  const teams: string[] = [];
  const teamIndex = new Map<string, number>();
  const publishedPoints = new Map<string, number>();

  for (const { layout, rows } of usable) {
    for (const column of layout.teamColumns) {
      if (!teamIndex.has(column.name)) {
        teamIndex.set(column.name, teams.length);
        teams.push(column.name);
      }
    }

    for (const row of rows) {
      const rowTeam = normalizeCell(row[0] ?? "");
      if (!isRowTeam(rowTeam)) continue;
      if (!teamIndex.has(rowTeam)) {
        teamIndex.set(rowTeam, teams.length);
        teams.push(rowTeam);
      }
      const rowIndex = teamIndex.get(rowTeam) as number;

      for (const column of layout.teamColumns) {
        const parsed = parseMatrixCell(row[column.index] ?? "");
        if (!parsed) continue;
        // A cell on the diagonal is the team playing itself.
        if (column.name === rowTeam) continue;
        const match: MatrixMatch = {
          home: rowTeam,
          away: column.name,
          homeScore: parsed[0],
          awayScore: parsed[1],
        };
        allMatches.push(match);
        if (rowIndex < (teamIndex.get(column.name) as number)) {
          upperMatches.push(match);
        }
      }

      if (layout.pointsColumn >= 0) {
        const points = normalizeCell(row[layout.pointsColumn] ?? "").replace(
          /[^\d]/g,
          "",
        );
        if (points.length > 0) publishedPoints.set(rowTeam, Number.parseInt(points, 10));
      }
    }
  }

  if (allMatches.length === 0) return null;
  if (publishedPoints.size === 0) {
    return {
      matches: allMatches,
      upperMatches,
      teams,
      interpretation: "all",
      agreement: 0,
      publishedPoints,
    };
  }

  const scoreOf = (matches: MatrixMatch[]): number => {
    const points = new Map<string, number>();
    for (const match of matches) {
      if (match.homeScore > match.awayScore) {
        points.set(match.home, (points.get(match.home) ?? 0) + 3);
      } else if (match.homeScore < match.awayScore) {
        points.set(match.away, (points.get(match.away) ?? 0) + 3);
      } else {
        points.set(match.home, (points.get(match.home) ?? 0) + 1);
        points.set(match.away, (points.get(match.away) ?? 0) + 1);
      }
    }
    let agree = 0;
    for (const [team, expected] of publishedPoints) {
      if (points.get(team) === expected) agree += 1;
    }
    return agree;
  };

  const allScore = scoreOf(allMatches);
  const upperScore = scoreOf(upperMatches);
  if (upperScore > allScore) {
    return {
      matches: upperMatches,
      upperMatches,
      teams,
      interpretation: "upper",
      agreement: upperScore,
      publishedPoints,
    };
  }
  return {
    matches: allMatches,
    upperMatches,
    teams,
    interpretation: "all",
    agreement: allScore,
    publishedPoints,
  };
}
