import type { PdfItem } from "./pdf";

export interface PdfStandingRow {
  teamName: string;
  position: number | null;
  points: number;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
}

export interface PdfStandingsSection {
  /** Heading found above the table, e.g. "1部". */
  label: string | null;
  rows: PdfStandingRow[];
  columns: string[];
}

interface Cell {
  text: string;
  x: number;
}

interface Row {
  y: number;
  page: number;
  cells: Cell[];
}

const LABELS = [
  "順位",
  "勝点",
  "勝ち点",
  "試合数",
  "試合",
  "勝数",
  "勝利",
  "敗数",
  "敗戦",
  "引分数",
  "引分",
  "得点",
  "総得点",
  "失点",
  "総失点",
  "得失点差",
  "得失差",
  "得失",
  "勝",
  "敗",
  "負",
  "分",
  "差",
  "勝率",
  "チーム名",
  "チーム",
  "節",
] as const;

type ColumnKey = (typeof LABELS)[number];

const NUMERIC = /^[+\-−ー]?\d{1,3}$/;
const TEAMISH = /[^\d\s]/;
/** Matrix phase labels and stray header words are not teams. */
const NOT_A_TEAM = /^(前期|後期|通年|上位|下位|順位|得失|得失点|得失点差|勝点|勝ち点|試合|試合数|節|月|日|時間|会場|チーム|チーム名|計|合計|現在)$/;

const SINGLE_CJK = /^[\u3040-\u30ff\u4e00-\u9fff]$/;

/**
 * Vertical labels (`勝` stacked above `点`, `得失点差` written one glyph per
 * line) are common in Japanese PDFs. Characters that share an X and sit on
 * consecutive baselines are joined so the label becomes readable.
 */
function mergeVerticalLabels(items: PdfItem[]): PdfItem[] {
  const sorted = [...items].sort((a, b) => a.x - b.x || b.y - a.y);
  const merged: PdfItem[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i += 1) {
    if (used.has(i)) continue;
    const first = sorted[i];
    if (!SINGLE_CJK.test(first.text.trim())) {
      merged.push(first);
      continue;
    }
    let text = first.text.trim();
    let y = first.y;
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (used.has(j)) continue;
      const next = sorted[j];
      if (!SINGLE_CJK.test(next.text.trim())) continue;
      if (Math.abs(next.x - first.x) > 2.5) continue;
      const gap = y - next.y;
      if (gap <= 0 || gap > 18) continue;
      text += next.text.trim();
      y = next.y;
      used.add(j);
      if (text.length > 8) break;
    }
    merged.push({ ...first, text });
  }
  return merged;
}

function groupRows(items: PdfItem[]): Row[] {
  const sorted = items
    .filter((item) => item.text.trim().length > 0)
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  const rows: Row[] = [];
  for (const item of sorted) {
    const last = rows[rows.length - 1];
    // PDF baselines inside one table row can differ by a few units, so merge
    // generously and rely on X for ordering.
    if (last && last.page === item.page && Math.abs(last.y - item.y) <= 6) {
      last.cells.push({ text: item.text.trim(), x: item.x });
    } else {
      rows.push({
        y: item.y,
        page: item.page,
        cells: [{ text: item.text.trim(), x: item.x }],
      });
    }
  }
  for (const row of rows) row.cells.sort((a, b) => a.x - b.x);
  return rows;
}

function isLabel(text: string): boolean {
  if ((LABELS as readonly string[]).includes(text)) return true;
  // Some generators split a label across runs (`得失点` + `差`, `勝` + `点`).
  return /^(得失点?差?|勝ち?点|順位|試合数?|総?得点|総?失点|勝数?|敗数?|引分数?)$/.test(text);
}

/**
 * Header labels can wrap across physical lines and can sit above the row that
 * holds 勝点 (`得失` / `順位` are often on their own baseline), so look a little
 * either side of the anchor row.
 */
function collectHeader(rows: Row[], start: number): Cell[] {
  const cells: Cell[] = [];
  const add = (row: Row) => {
    for (const cell of row.cells) {
      // Labels may be rendered with spaces between glyphs ("得失 点差").
      const text = cell.text.replace(/\s+/g, "");
      if (!isLabel(text)) continue;
      if (cells.some((existing) => existing.text === text)) continue;
      cells.push({ text, x: cell.x });
    }
  };
  for (let i = start - 4; i <= start; i += 1) {
    if (i >= 0) add(rows[i]);
  }
  for (let i = start + 1; i < Math.min(start + 3, rows.length); i += 1) add(rows[i]);
  return cells;
}

function isContinuationRow(row: Row): boolean {
  return row.cells.every(
    (cell) => NUMERIC.test(cell.text) || isLabel(cell.text),
  );
}

function nearestLabel(header: Cell[], x: number): ColumnKey | null {
  let best: { label: ColumnKey; distance: number } | null = null;
  for (const cell of header) {
    if (cell.text === "チーム" || cell.text === "チーム名") continue;
    const distance = Math.abs(cell.x - x);
    if (!best || distance < best.distance) {
      best = { label: cell.text as ColumnKey, distance };
    }
  }
  if (!best || best.distance > 40) return null;
  return best.label;
}

/** Removes the spaces PDF extraction inserts between Japanese glyphs. */
function cleanTeamName(text: string): string {
  const hasJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/.test(text);
  return hasJapanese
    ? text.replace(/\s+/g, "")
    : text.replace(/\s+/g, " ").trim();
}

function toNumber(text: string): number | null {
  const value = Number.parseInt(text.replace(/[−ー]/g, "-"), 10);
  return Number.isFinite(value) ? value : null;
}

function directSection(row: Row): string | null {
  if (row.cells.length > 3) return null;
  const text = row.cells
    .map((cell) => cell.text)
    .join("")
    .replace(/\s+/g, "");
  return /^[Ａ-ＺA-Z0-9０-９第]*[部節]$/.test(text) ? text : null;
}

function sectionLabelOf(rows: Row[], index: number): string | null {
  for (let i = index; i >= Math.max(0, index - 6); i -= 1) {
    const found = directSection(rows[i]);
    if (found) return found.normalize("NFKC");
  }
  return null;
}

/**
 * Rebuilds published standings tables from a PDF text layer using coordinates.
 *
 * PDFs from Excel/Word keep every cell as an absolutely positioned text run, so
 * grouping runs by Y and mapping numbers back to the header's X positions
 * recovers the table even when a team's numbers sit on the following line.
 * Only used for sources that publish a real standings table.
 */
export function extractPdfStandings(items: PdfItem[]): PdfStandingsSection[] {
  const rows = groupRows(mergeVerticalLabels(items));
  if (rows.length < 3) return [];

  const sections: PdfStandingsSection[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const headerRow = rows[i];
    const hasPoints = headerRow.cells.some(
      (cell) => cell.text === "勝点" || cell.text === "勝ち点",
    );
    if (!hasPoints) continue;

    const header = collectHeader(rows, i);
    if (header.length < 2) continue;
    const label = sectionLabelOf(rows, i);

    const table: PdfStandingRow[] = [];
    const seenTeams = new Set<string>();
    for (let j = i + 1; j < rows.length; j += 1) {
      const row = rows[j];
      // Stop when the next header or a new section starts.
      if (row.cells.some((cell) => cell.text === "勝点" || cell.text === "勝ち点")) break;
      if (table.length > 0 && directSection(row)) break;

      const teamIndexInRow = row.cells.findIndex(
        (cell) =>
          TEAMISH.test(cell.text) &&
          !isLabel(cell.text) &&
          !NUMERIC.test(cell.text) &&
          !NOT_A_TEAM.test(cell.text.replace(/\s+/g, "")) &&
          cell.text.length >= 2,
      );
      if (teamIndexInRow < 0) continue;
      const teamCell = row.cells[teamIndexInRow];
      // A long name can be split so the first glyph becomes its own text run
      // (`報` + `徳 A`), leaving the leading character orphaned.
      let rawName = teamCell.text;
      for (let k = teamIndexInRow - 1; k >= 0; k -= 1) {
        const previous = row.cells[k];
        const gap = teamCell.x - previous.x;
        if (gap > 30) break;
        if (NUMERIC.test(previous.text)) break;
        if (!SINGLE_CJK.test(previous.text.trim())) break;
        rawName = previous.text + rawName;
      }
      const teamName = cleanTeamName(rawName);
      if (seenTeams.has(teamName)) continue;

      // A team's numbers are on its own row, or on the following row(s) that
      // contain nothing but numbers (`① 帝京長岡3rd` / `20 37 21 16 2`).
      const window = [...row.cells.filter((cell) => cell !== teamCell)];
      for (let k = j + 1; k < Math.min(j + 3, rows.length); k += 1) {
        const next = rows[k];
        if (!isContinuationRow(next)) break;
        window.push(...next.cells);
      }
      const numbers = window.filter((cell) => NUMERIC.test(cell.text));
      if (numbers.length < 2) continue;

      const mapped = new Map<ColumnKey, number>();
      // Preferred: the header lists exactly the aggregate columns in the same
      // order as the numbers, which is far more reliable than X proximity
      // (a wrapped 得失点差 label can sit far from its column).
      const ordered = header
        .filter((cell) => cell.text !== "チーム" && cell.text !== "チーム名" && cell.text !== "節")
        .sort((a, b) => a.x - b.x)
        .map((cell) => cell.text as ColumnKey);
      if (numbers.length === ordered.length) {
        numbers.forEach((cell, index) => {
          const value = toNumber(cell.text);
          if (value !== null) mapped.set(ordered[index], value);
        });
      } else {
        for (const cell of numbers) {
          const column = nearestLabel(header, cell.x);
          if (!column || mapped.has(column)) continue;
          const value = toNumber(cell.text);
          if (value !== null) mapped.set(column, value);
        }
      }

      const points = mapped.get("勝点") ?? mapped.get("勝ち点");
      if (points === undefined) continue;

      seenTeams.add(teamName);
      table.push({
        teamName,
        position: mapped.get("順位") ?? null,
        points,
        played: mapped.get("試合数") ?? mapped.get("試合") ?? null,
        won: mapped.get("勝数") ?? mapped.get("勝利") ?? mapped.get("勝") ?? null,
        drawn:
          mapped.get("引分数") ?? mapped.get("引分") ?? mapped.get("分") ?? null,
        lost: mapped.get("敗数") ?? mapped.get("敗戦") ?? mapped.get("敗") ?? null,
        goalsFor: mapped.get("得点") ?? mapped.get("総得点") ?? null,
        goalsAgainst: mapped.get("失点") ?? mapped.get("総失点") ?? null,
        goalDifference:
          mapped.get("得失点差") ??
          mapped.get("得失差") ??
          mapped.get("得失") ??
          mapped.get("差") ??
          null,
      });
    }

    if (table.length >= 4) {
      // When the source does not publish a 順位 column, rank by the standard
      // league rules so the screen still shows an order.
      if (table.every((row) => row.position === null)) {
        [...table]
          .sort(
            (a, b) =>
              b.points - a.points ||
              (b.goalDifference ?? 0) - (a.goalDifference ?? 0) ||
              (b.goalsFor ?? 0) - (a.goalsFor ?? 0),
          )
          .forEach((row, index) => {
            row.position = index + 1;
          });
      } else {
        table.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      }
      sections.push({ label, rows: table, columns: header.map((cell) => cell.text) });
    }
    i = Math.max(i, i + 1);
  }

  return sections;
}

/**
 * Sanity check used before trusting a parsed table: if 試合数 is published it
 * must be consistent with the points total (3 points per game at most), and the
 * teams must have played a plausible number of matches.
 */
export function isPlausibleStandings(section: PdfStandingsSection): boolean {
  const rows = section.rows;
  if (rows.length < 4) return false;
  const points = rows.map((row) => row.points);
  if (points.some((value) => value < 0)) return false;
  const top = Math.max(...points);
  if (top === 0) return false;

  const played = rows
    .map((row) => row.played)
    .filter((value): value is number => value !== null);
  if (played.length >= Math.ceil(rows.length / 2)) {
    if (played.some((value) => value <= 0)) return false;
    const maxPlayed = Math.max(...played);
    if (top > maxPlayed * 3) return false;
  }

  const positions = rows
    .map((row) => row.position)
    .filter((value): value is number => value !== null);
  if (positions.length === rows.length) {
    const unique = new Set(positions);
    if (unique.size !== positions.length) return false;
    if (Math.max(...positions) > rows.length) return false;
  }
  return true;
}
