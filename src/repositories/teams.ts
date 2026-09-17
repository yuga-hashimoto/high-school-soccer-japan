import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clubs, prefectures, teams } from "@/db/schema";
import {
  getClubForTeam,
  getDerivedTeamEntry,
  getMatchesForTeam,
  getNextMatchForTeam,
  getSiblingTeams,
  getTeamSeasonEntries,
  type MatchRow,
  type TeamSeasonEntry,
} from "./matches";

export interface TeamDetail {
  team: {
    id: string;
    name: string;
    shortName: string | null;
    squadName: string | null;
  };
  club: {
    id: string;
    name: string;
    type: string;
    prefectureName: string | null;
    prefectureSlug: string | null;
  } | null;
  entry: TeamSeasonEntry | null;
  siblings: Array<{ id: string; name: string; squadName: string | null }>;
  nextMatch: MatchRow | null;
  recentMatches: MatchRow[];
  seasonRecord: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    position: number;
  } | null;
}

export function getTeamById(teamId: string) {
  const db = getDb();
  return db.select().from(teams).where(eq(teams.id, teamId)).all()[0] ?? null;
}

export function getTeamDetail(
  teamId: string,
  options?: { now?: Date; recentLimit?: number },
): TeamDetail | null {
  const team = getTeamById(teamId);
  if (!team) return null;

  const db = getDb();
  const clubRow = getClubForTeam(team.clubId);
  let prefectureName: string | null = null;
  let prefectureSlug: string | null = null;
  if (clubRow?.prefectureId) {
    const pref = db
      .select({ name: prefectures.name, slug: prefectures.slug })
      .from(prefectures)
      .where(eq(prefectures.id, clubRow.prefectureId))
      .all()[0];
    prefectureName = pref?.name ?? null;
    prefectureSlug = pref?.slug ?? null;
  }

  const entries = getTeamSeasonEntries(teamId);
  const entry = entries[0] ?? getDerivedTeamEntry(teamId);
  const now = options?.now ?? new Date();
  const recentLimit = options?.recentLimit ?? 5;

  let recentMatches: MatchRow[] = [];
  if (entry) {
    recentMatches = getMatchesForTeam(teamId, 40)
      .filter((match) => match.seasonId === entry.seasonId)
      .slice(0, recentLimit);
  } else {
    recentMatches = getMatchesForTeam(teamId, recentLimit);
  }

  const finished = getMatchesForTeam(teamId, 60).filter(
    (match) => match.status === "FINISHED",
  );

  return {
    team: {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      squadName: team.squadName,
    },
    club: clubRow
      ? {
          id: clubRow.id,
          name: clubRow.name,
          type: clubRow.type,
          prefectureName,
          prefectureSlug,
        }
      : null,
    entry,
    siblings: getSiblingTeams(team.clubId, team.id),
    nextMatch: getNextMatchForTeam(teamId, now),
    recentMatches,
    seasonRecord: entry
      ? {
          played: entry.played,
          won: entry.won,
          drawn: entry.drawn,
          lost: entry.lost,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          goalDifference: entry.goalDifference,
          points: entry.points,
          position: entry.position,
        }
      : aggregateRecord(finished, teamId),
  };
}

function aggregateRecord(
  finished: MatchRow[],
  teamId: string,
): TeamDetail["seasonRecord"] {
  if (finished.length === 0) return null;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const match of finished) {
    const isHome = match.homeTeamId === teamId;
    const own = isHome ? match.homeScore : match.awayScore;
    const against = isHome ? match.awayScore : match.homeScore;
    if (own === null || against === null) continue;
    goalsFor += own;
    goalsAgainst += against;
    if (own > against) won += 1;
    else if (own < against) lost += 1;
    else drawn += 1;
  }
  const played = won + drawn + lost;
  if (played === 0) return null;
  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: won * 3 + drawn,
    position: 0,
  };
}

export function countTeams(): number {
  const db = getDb();
  return db.select({ id: teams.id }).from(teams).all().length;
}

export function countClubs(): number {
  const db = getDb();
  return db.select({ id: clubs.id }).from(clubs).all().length;
}
