import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { clubs, competitions, matches, seasons, standings, teams } from "@/db/schema";

const homeTeams = alias(teams, "home_teams");
const awayTeams = alias(teams, "away_teams");

const matchSelection = {
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  venue: matches.venue,
  homeScore: matches.homeScore,
  awayScore: matches.awayScore,
  status: matches.status,
  round: matches.round,
  competitionId: matches.competitionId,
  competitionName: competitions.name,
  competitionSlug: competitions.slug,
  seasonId: matches.seasonId,
  homeTeamId: matches.homeTeamId,
  awayTeamId: matches.awayTeamId,
  homeTeamName: homeTeams.name,
  awayTeamName: awayTeams.name,
} as const;

export type MatchRow = {
  id: string;
  kickoffAt: Date | null;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  round: string | null;
  competitionId: string;
  competitionName: string;
  competitionSlug: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
};

function baseMatchQuery(db: ReturnType<typeof getDb>) {
  return db
    .select(matchSelection)
    .from(matches)
    .innerJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .innerJoin(competitions, eq(matches.competitionId, competitions.id));
}

function toRows(rows: unknown): MatchRow[] {
  return rows as MatchRow[];
}

/** JST day boundaries for a `YYYY-MM-DD` string. */
export function jstDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getMatchesByDate(date: string): MatchRow[] {
  const { start, end } = jstDayRange(date);
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(and(gte(matches.kickoffAt, start), lt(matches.kickoffAt, end)))
      .orderBy(asc(matches.kickoffAt))
      .all(),
  );
}

export function getMatchesForSeason(seasonId: string, limit = 200): MatchRow[] {
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(eq(matches.seasonId, seasonId))
      .orderBy(asc(matches.kickoffAt))
      .limit(limit)
      .all(),
  );
}

export function getMatchesForSeasons(seasonIds: string[], limit = 400): MatchRow[] {
  if (seasonIds.length === 0) return [];
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(inArray(matches.seasonId, seasonIds))
      .orderBy(asc(matches.kickoffAt))
      .limit(limit)
      .all(),
  );
}

export function getMatchesForTeam(teamId: string, limit = 10): MatchRow[] {
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .orderBy(desc(matches.kickoffAt))
      .limit(limit)
      .all(),
  );
}

export function getNextMatchForTeam(teamId: string, now = new Date()): MatchRow | null {
  const db = getDb();
  const rows = toRows(
    baseMatchQuery(db)
      .where(
        and(
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
          gte(matches.kickoffAt, now),
        ),
      )
      .orderBy(asc(matches.kickoffAt))
      .limit(1)
      .all(),
  );
  return rows[0] ?? null;
}

/** Upcoming matches across every competition, for the home screen. */
export function getUpcomingMatches(now = new Date(), limit = 20): MatchRow[] {
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(gte(matches.kickoffAt, now))
      .orderBy(asc(matches.kickoffAt))
      .limit(limit)
      .all(),
  );
}

export function getFinishedMatchesDesc(limit = 30): MatchRow[] {
  const db = getDb();
  return toRows(
    baseMatchQuery(db)
      .where(eq(matches.status, "FINISHED"))
      .orderBy(desc(matches.kickoffAt))
      .limit(limit)
      .all(),
  );
}

/**
 * Distinct calendar dates that have at least one match, used by the match
 * screen's date picker.
 */
export function getMatchDates(limit = 30): string[] {
  const db = getDb();
  const rows = db
    .select({ kickoffAt: matches.kickoffAt })
    .from(matches)
    .where(sql`${matches.kickoffAt} is not null`)
    .orderBy(desc(matches.kickoffAt))
    .all();
  const days = new Set<string>();
  for (const row of rows) {
    if (!row.kickoffAt) continue;
    days.add(toJstDateString(row.kickoffAt));
    if (days.size >= limit) break;
  }
  return [...days].sort().reverse();
}

export function toJstDateString(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function toJstTimeString(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(11, 16);
}

/** Teams that share a club, so a team page can link to its siblings. */
export function getSiblingTeams(clubId: string, excludeTeamId: string) {
  const db = getDb();
  return db
    .select({ id: teams.id, name: teams.name, squadName: teams.squadName })
    .from(teams)
    .where(and(eq(teams.clubId, clubId), ne(teams.id, excludeTeamId)))
    .all();
}

export function getClubForTeam(clubId: string) {
  const db = getDb();
  return db.select().from(clubs).where(eq(clubs.id, clubId)).all()[0] ?? null;
}

export function getSeasonById(seasonId: string) {
  const db = getDb();
  return db.select().from(seasons).where(eq(seasons.id, seasonId)).all()[0] ?? null;
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  sourceId: string | null;
  fetchedAt: Date | null;
}

export function getStandingsWithTeams(seasonId: string): StandingRow[] {
  const db = getDb();
  const stored = loadStoredStandings(db, seasonId);
  if (stored.length > 0) return stored;

  // No published table: fall back to standings derived from parsed results.
  return deriveStandingsFromMatches(seasonId);
}

function loadStoredStandings(
  db: ReturnType<typeof getDb>,
  seasonId: string,
): StandingRow[] {
  return db
    .select({
      position: standings.position,
      teamId: standings.teamId,
      teamName: teams.name,
      played: standings.played,
      won: standings.won,
      drawn: standings.drawn,
      lost: standings.lost,
      goalsFor: standings.goalsFor,
      goalsAgainst: standings.goalsAgainst,
      goalDifference: standings.goalDifference,
      points: standings.points,
      sourceId: standings.sourceId,
      fetchedAt: standings.fetchedAt,
    })
    .from(standings)
    .innerJoin(teams, eq(standings.teamId, teams.id))
    .where(eq(standings.seasonId, seasonId))
    .orderBy(asc(standings.position))
    .all();
}

/**
 * Some associations only publish a results PDF. Rather than trying to read a
 * 星取表 layout, standings are computed from the matches we did parse. This is
 * a faithful league table: 3 points for a win, 1 for a draw, ranked on points,
 * goal difference, then goals scored.
 */
export function deriveStandingsFromMatches(seasonId: string): StandingRow[] {
  const db = getDb();
  const rows = toRows(
    baseMatchQuery(db).where(eq(matches.seasonId, seasonId)).all(),
  );

  interface Accumulator {
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  }
  const table = new Map<string, Accumulator>();

  const ensure = (teamId: string, teamName: string): Accumulator => {
    const existing = table.get(teamId);
    if (existing) return existing;
    const created: Accumulator = {
      teamId,
      teamName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    table.set(teamId, created);
    return created;
  };

  for (const row of rows) {
    if (row.status !== "FINISHED") continue;
    if (row.homeScore === null || row.awayScore === null) continue;
    const home = ensure(row.homeTeamId, row.homeTeamName);
    const away = ensure(row.awayTeamId, row.awayTeamName);
    home.played += 1;
    away.played += 1;
    home.goalsFor += row.homeScore;
    home.goalsAgainst += row.awayScore;
    away.goalsFor += row.awayScore;
    away.goalsAgainst += row.homeScore;
    if (row.homeScore > row.awayScore) {
      home.won += 1;
      away.lost += 1;
    } else if (row.homeScore < row.awayScore) {
      away.won += 1;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
    }
  }

  const list = [...table.values()].map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    points: row.won * 3 + row.drawn,
  }));

  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName, "ja"),
  );

  return list.map((row, index) => ({
    position: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
    sourceId: null,
    fetchedAt: null,
  }));
}

/** Derived standings for a competition/year, used when no table was published. */
export function getDerivedStandingsForCompetition(
  competitionId: string,
  year?: number,
): StandingRow[] {
  const db = getDb();
  const seasonRows = db
    .select({ id: seasons.id, year: seasons.year })
    .from(seasons)
    .where(
      year === undefined
        ? eq(seasons.competitionId, competitionId)
        : and(eq(seasons.competitionId, competitionId), eq(seasons.year, year)),
    )
    .orderBy(desc(seasons.year))
    .all();
  const season = seasonRows[0];
  if (!season) return [];
  return deriveStandingsFromMatches(season.id);
}

/** The season a team is currently entered in, preferring the newest year. */
export function getTeamSeasonEntries(teamId: string) {
  const db = getDb();
  return db
    .select({
      seasonId: seasons.id,
      year: seasons.year,
      competitionId: competitions.id,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      position: standings.position,
      points: standings.points,
      played: standings.played,
      won: standings.won,
      drawn: standings.drawn,
      lost: standings.lost,
      goalsFor: standings.goalsFor,
      goalsAgainst: standings.goalsAgainst,
      goalDifference: standings.goalDifference,
      sourceId: standings.sourceId,
      fetchedAt: standings.fetchedAt,
    })
    .from(standings)
    .innerJoin(seasons, eq(standings.seasonId, seasons.id))
    .innerJoin(competitions, eq(standings.competitionId, competitions.id))
    .where(eq(standings.teamId, teamId))
    .orderBy(desc(seasons.year), asc(standings.position))
    .all();
}

export type TeamSeasonEntry = ReturnType<typeof getTeamSeasonEntries>[number];

/**
 * Entry for a team whose competition publishes only results. Uses the most
 * recent season the team appears in and the standings derived from results.
 */
export function getDerivedTeamEntry(teamId: string): TeamSeasonEntry | null {
  const db = getDb();
  const recent = db
    .select({
      seasonId: matches.seasonId,
      competitionId: matches.competitionId,
      year: seasons.year,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .innerJoin(competitions, eq(matches.competitionId, competitions.id))
    .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
    .orderBy(desc(seasons.year))
    .limit(1)
    .all()[0];
  if (!recent) return null;

  const mine = deriveStandingsFromMatches(recent.seasonId).find(
    (row) => row.teamId === teamId,
  );
  if (!mine) return null;

  return {
    seasonId: recent.seasonId,
    year: recent.year,
    competitionId: recent.competitionId,
    competitionName: recent.competitionName,
    competitionSlug: recent.competitionSlug,
    position: mine.position,
    points: mine.points,
    played: mine.played,
    won: mine.won,
    drawn: mine.drawn,
    lost: mine.lost,
    goalsFor: mine.goalsFor,
    goalsAgainst: mine.goalsAgainst,
    goalDifference: mine.goalDifference,
    sourceId: null,
    fetchedAt: null,
  };
}
