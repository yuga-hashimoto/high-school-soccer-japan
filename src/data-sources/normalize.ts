import crypto from "node:crypto";

/** NFKC-normalise, drop bracketed annotations, collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[（(][^）)]*[）)]\s*$/u, "")
    .replace(/[\s\u3000]+/g, " ")
    .trim();
}

/** Stable, collision-resistant key used as a database id for external names. */
export function keyFor(prefix: string, value: string): string {
  const digest = crypto
    .createHash("sha1")
    .update(normalizeName(value))
    .digest("hex")
    .slice(0, 12);
  return `${prefix}-${digest}`;
}

export function teamSlug(name: string): string {
  return keyFor("team", name);
}

export function clubSlug(name: string): string {
  return keyFor("club", name);
}

const SQUAD_SUFFIXES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^(.*?)[\s\u3000]*([A-Z])$/u, (m) => m[2]],
  [/^(.*?)[\s\u3000]*(2nd|3rd|1st)$/iu, (m) => m[2].toLowerCase()],
  [/^(.*?)[\s\u3000]*(セカンド|サード|ファースト)$/u, (m) => m[2]],
];

/**
 * Separates the school/club from its squad label.
 *
 * "東福岡B"                 -> { club: "東福岡", squad: "B" }
 * "大津高校2nd"             -> { club: "大津高校", squad: "2nd" }
 * "アビスパ福岡U-18 B"      -> { club: "アビスパ福岡U-18", squad: "B" }
 * "ヴィッセル神戸U-18"      -> { club: "ヴィッセル神戸U-18", squad: null }
 */
export function splitTeamName(rawName: string): {
  clubName: string;
  squadName: string | null;
} {
  const name = normalizeName(rawName);
  for (const [pattern, extract] of SQUAD_SUFFIXES) {
    const match = name.match(pattern);
    if (!match) continue;
    const club = match[1].trim();
    const squad = extract(match);
    if (club.length === 0) continue;
    return { clubName: club, squadName: squad };
  }
  return { clubName: name, squadName: null };
}

/** "2026/04/04" + "13:00" -> Date (JST). */
export function parseJstDateTime(
  date: string | null | undefined,
  time: string | null | undefined,
): Date | null {
  if (!date) return null;
  const [y, m, d] = date.split("/").map((part) => Number.parseInt(part, 10));
  if (!y || !m || !d) return null;
  const [hh, mm] = (time ?? "00:00").split(":").map((part) => Number.parseInt(part, 10));
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(
    d,
  ).padStart(2, "0")}T${String(hh || 0).padStart(2, "0")}:${String(mm || 0).padStart(
    2,
    "0",
  )}:00+09:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "MM/DD （土）" + reference year -> Date. */
export function parseMonthDay(
  value: string,
  year: number,
): Date | null {
  const match = value.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const parsed = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "" || text === "-" || text === "—") return null;
  const parsed = Number.parseInt(text.replace(/[^\d+-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}
