import { asc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clubs, competitions, prefectures, regions, standings, teams } from "@/db/schema";

export interface TeamSearchResult {
  kind: "team";
  teamId: string;
  teamName: string;
  clubName: string | null;
  competitionName: string | null;
  competitionSlug: string | null;
  position: number | null;
  points: number | null;
}

export interface ClubSearchResult {
  kind: "club";
  clubId: string;
  clubName: string;
  prefectureName: string | null;
  teamCount: number;
}

export interface CompetitionSearchResult {
  kind: "competition";
  competitionId: string;
  competitionName: string;
  competitionSlug: string;
  category: string;
}

export interface PrefectureSearchResult {
  kind: "prefecture";
  prefectureId: string;
  prefectureName: string;
  prefectureSlug: string;
  regionName: string;
}

export type SearchResult =
  | TeamSearchResult
  | ClubSearchResult
  | CompetitionSearchResult
  | PrefectureSearchResult;

export interface SearchResults {
  query: string;
  teams: TeamSearchResult[];
  clubs: ClubSearchResult[];
  competitions: CompetitionSearchResult[];
  prefectures: PrefectureSearchResult[];
  total: number;
}

/**
 * Nationwide cross-entity search. Teams are ranked first because "東福岡"
 * should surface 東福岡A / 東福岡B before the prefecture that hosts them.
 */
export function searchEverything(rawQuery: string, limitPerKind = 12): SearchResults {
  const query = rawQuery.trim();
  if (query.length === 0) {
    return { query, teams: [], clubs: [], competitions: [], prefectures: [], total: 0 };
  }
  const db = getDb();
  const pattern = `%${query}%`;

  const teamRows = db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      clubName: clubs.name,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      position: standings.position,
      points: standings.points,
    })
    .from(teams)
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .leftJoin(standings, eq(standings.teamId, teams.id))
    .leftJoin(competitions, eq(standings.competitionId, competitions.id))
    .where(or(like(teams.name, pattern), like(clubs.name, pattern)))
    .orderBy(asc(teams.name), asc(standings.position))
    .limit(limitPerKind * 3)
    .all();

  const seenTeams = new Set<string>();
  const teamResults: TeamSearchResult[] = [];
  for (const row of teamRows) {
    if (seenTeams.has(row.teamId)) continue;
    seenTeams.add(row.teamId);
    teamResults.push({
      kind: "team",
      teamId: row.teamId,
      teamName: row.teamName,
      clubName: row.clubName ?? null,
      competitionName: row.competitionName ?? null,
      competitionSlug: row.competitionSlug ?? null,
      position: row.position ?? null,
      points: row.points ?? null,
    });
    if (teamResults.length >= limitPerKind) break;
  }

  const clubRows = db
    .select({
      clubId: clubs.id,
      clubName: clubs.name,
      prefectureName: prefectures.name,
      teamCount: sql<number>`count(${teams.id})`,
    })
    .from(clubs)
    .leftJoin(prefectures, eq(clubs.prefectureId, prefectures.id))
    .leftJoin(teams, eq(teams.clubId, clubs.id))
    .where(like(clubs.name, pattern))
    .groupBy(clubs.id, clubs.name, prefectures.name)
    .limit(limitPerKind)
    .all();

  const competitionRows = db
    .select({
      competitionId: competitions.id,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      category: competitions.category,
    })
    .from(competitions)
    .where(
      or(
        like(competitions.name, pattern),
        like(competitions.shortName, pattern),
        like(competitions.slug, pattern),
      ),
    )
    .orderBy(asc(competitions.sortOrder))
    .limit(limitPerKind)
    .all();

  const prefectureRows = db
    .select({
      prefectureId: prefectures.id,
      prefectureName: prefectures.name,
      prefectureSlug: prefectures.slug,
      regionName: regions.name,
    })
    .from(prefectures)
    .innerJoin(regions, eq(prefectures.regionId, regions.id))
    .where(or(like(prefectures.name, pattern), like(prefectures.slug, pattern)))
    .orderBy(asc(prefectures.sortOrder))
    .limit(limitPerKind)
    .all();

  return {
    query,
    teams: teamResults,
    clubs: clubRows.map((row) => ({
      kind: "club" as const,
      clubId: row.clubId,
      clubName: row.clubName,
      prefectureName: row.prefectureName ?? null,
      teamCount: Number(row.teamCount ?? 0),
    })),
    competitions: competitionRows.map((row) => ({
      kind: "competition" as const,
      ...row,
    })),
    prefectures: prefectureRows.map((row) => ({
      kind: "prefecture" as const,
      ...row,
    })),
    total:
      teamResults.length +
      clubRows.length +
      competitionRows.length +
      prefectureRows.length,
  };
}
