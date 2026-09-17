/**
 * Tiny dependency-free HTML helpers. Sources publish messy markup, so these
 * only do what is needed: recover table rows and strip tags.
 */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&yen;/gi, "¥")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

const HEADER_HINT =
  /順位|チーム|勝点|勝ち点|試合|勝|分|敗|得点|失点|得失|年月日|日時|会場|対戦|キックオフ/;

export function extractTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableMatches = html.matchAll(/<table[\s\S]*?<\/table>/gi);
  for (const tableMatch of tableMatches) {
    const tableHtml = tableMatch[0];
    const rows: string[][] = [];
    for (const rowMatch of tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(
        /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi,
      )) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length === 0) continue;

    // Many sites put a note ("<<スワイプでご覧いただけます>>") above the real
    // header, so look for the header within the first few rows instead of
    // assuming it is row 0.
    const headerIndex = rows
      .slice(0, 3)
      .findIndex((row) => row.some((cell) => HEADER_HINT.test(cell)));

    if (headerIndex === -1) {
      tables.push({ headers: [], rows });
    } else {
      tables.push({
        headers: rows[headerIndex],
        rows: rows.slice(headerIndex + 1),
      });
    }
  }
  return tables;
}

export function looksLikeHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => HEADER_HINT.test(cell));
}

/**
 * Narrow check used to drop header rows from a data set. It must NOT match
 * "2 - 1 試合終了", so it deliberately avoids bare 勝/分/敗/試合.
 */
const STRICT_HEADER =
  /順位|チーム名|勝点|勝ち点|得失点|得失差|キックオフ|試合状況|試合会場|試合日程|対戦カード|ホームチーム/;

export function isHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => STRICT_HEADER.test(cell));
}

/**
 * Many Japanese football pages list a table without a <thead>; instead the
 * first column of each team row is just an index. This helper finds the table
 * that best matches the requested header keywords.
 */
export function findTable(
  html: string,
  requiredAny: string[],
): ParsedTable | null {
  const tables = extractTables(html);
  let best: { table: ParsedTable; score: number } | null = null;
  for (const table of tables) {
    const flat = (table.headers.length > 0 ? table.headers : table.rows[0] ?? []).join(" ");
    const score = requiredAny.filter((keyword) => flat.includes(keyword)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { table, score };
    }
  }
  return best?.table ?? null;
}

export function extractLinks(
  html: string,
  baseUrl: string,
): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  for (const match of html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].trim();
    if (href.startsWith("#") || href.startsWith("javascript:")) continue;
    try {
      links.push({
        href: new URL(href, baseUrl).toString(),
        text: stripTags(match[2]),
      });
    } catch {
      continue;
    }
  }
  return links;
}

export function toNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const normalized = value.replace(/[^\d.+-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
