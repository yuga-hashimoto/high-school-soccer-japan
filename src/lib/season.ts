/**
 * The Japanese school season starts in April. Before April we still consider
 * the previous calendar year the active season.
 */
export function currentSeasonYear(reference: Date = new Date()): number {
  const jst = new Date(reference.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const year = jst.getUTCFullYear();
  return month < 4 ? year - 1 : year;
}

export function seasonYearFromEnv(): number {
  const raw = process.env.SEASON_YEAR;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : currentSeasonYear();
}
