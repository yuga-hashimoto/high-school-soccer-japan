import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  clubs,
  competitions,
  matches,
  seasons,
  seasonTeams,
  standings,
  teams,
} from "@/db/schema";
import { clubSlug } from "@/data-sources/normalize";
import type {
  CompetitionDTO,
  MatchDTO,
  StandingDTO,
  TeamDTO,
} from "@/data-sources/types";

export type StandingWithName = StandingDTO & { teamName?: string };

export interface IngestContext {
  sourceId: string;
  parserVersion: string;
  fetchedAt: Date;
  seasonYear: number;
}

export interface IngestResult {
  competitions: number;
  teams: number;
  matches: number;
  standings: number;
  warnings: string[];
}

function stableId(prefix: string, ...parts: Array<string | number | null>): string {
  const digest = crypto
    .createHash("sha1")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex")
    .slice(0, 16);
  return `${prefix}-${digest}`;
}

function competitionIdFor(slug: string): string {
  return `comp-${slug}`;
}

function seasonIdFor(competitionId: string, year: number): string {
  return `season-${competitionId}-${year}`;
}

function inferClubType(name: string): "SCHOOL" | "CLUB" {
  return /U-?18|ユース|アカデミー/i.test(name) ? "CLUB" : "SCHOOL";
}

export function ensureCompetition(
  db: Db,
  dto: CompetitionDTO,
  ctx: IngestContext,
): string {
  const id = competitionIdFor(dto.slug);
  const existing = db
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.slug, dto.slug))
    .all()[0];

  const parentId = dto.parentSlug
    ? ensureCompetition(db, { slug: dto.parentSlug, name: dto.parentSlug, category: dto.category }, ctx)
    : null;

  if (existing) {
    return existing.id;
  }

  db.insert(competitions)
    .values({
      id,
      name: dto.name,
      shortName: dto.shortName ?? null,
      slug: dto.slug,
      category: dto.category,
      parentCompetitionId: parentId,
      regionId: null,
      prefectureId: null,
      level: dto.level ?? null,
      sortOrder: dto.sortOrder ?? 0,
      sourceId: ctx.sourceId,
    })
    .run();
  return id;
}

export function ensureSeason(
  db: Db,
  competitionSlug: string,
  ctx: IngestContext,
  competitionName?: string,
): { seasonId: string; competitionId: string } {
  const competitionId = ensureCompetition(
    db,
    {
      slug: competitionSlug,
      name: competitionName ?? competitionSlug,
      category: "PREFECTURE",
    },
    ctx,
  );
  const seasonId = seasonIdFor(competitionId, ctx.seasonYear);
  const existing = db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .all()[0];

  if (existing) {
    db.update(seasons)
      .set({ sourceId: ctx.sourceId })
      .where(eq(seasons.id, seasonId))
      .run();
    return { seasonId, competitionId };
  }

  db.insert(seasons)
    .values({
      id: seasonId,
      competitionId,
      year: ctx.seasonYear,
      name: competitionName ?? `${ctx.seasonYear}`,
      status: "IN_PROGRESS",
      sourceId: ctx.sourceId,
    })
    .run();
  return { seasonId, competitionId };
}

function ensureClub(db: Db, team: TeamDTO, ctx: IngestContext): string | null {
  const clubName = team.clubName ?? team.name;
  const id = team.clubSlug ?? clubSlug(clubName);
  const existing = db
    .select({ id: clubs.id })
    .from(clubs)
    .where(eq(clubs.id, id))
    .all()[0];
  if (existing) return existing.id;

  db.insert(clubs)
    .values({
      id,
      name: clubName,
      shortName: null,
      prefectureId: null,
      type: team.clubType ?? inferClubType(clubName),
    })
    .onConflictDoNothing()
    .run();
  void ctx;
  return id;
}

export function ensureTeam(db: Db, team: TeamDTO, ctx: IngestContext): string {
  const clubId = ensureClub(db, team, ctx);
  const existing = db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.id, team.slug))
    .all()[0];

  if (existing) {
    db.update(teams)
      .set({
        name: team.name,
        shortName: team.shortName ?? null,
        squadName: team.squadName ?? null,
        clubId: clubId ?? clubSlug(team.name),
      })
      .where(eq(teams.id, team.slug))
      .run();
    return team.slug;
  }

  db.insert(teams)
    .values({
      id: team.slug,
      clubId: clubId ?? clubSlug(team.name),
      name: team.name,
      shortName: team.shortName ?? null,
      squadName: team.squadName ?? null,
    })
    .run();
  return team.slug;
}

export function ingestCompetitions(
  db: Db,
  dtos: CompetitionDTO[],
  ctx: IngestContext,
): number {
  for (const dto of dtos) ensureCompetition(db, dto, ctx);
  return dtos.length;
}

export function ingestTeams(db: Db, dtos: TeamDTO[], ctx: IngestContext): number {
  for (const dto of dtos) ensureTeam(db, dto, ctx);
  return dtos.length;
}

export function ingestStandings(
  db: Db,
  dtos: StandingWithName[],
  ctx: IngestContext,
): { standings: number; teams: number; warnings: string[] } {
  const warnings: string[] = [];
  const knownTeams = new Set(
    db.select({ id: teams.id }).from(teams).all().map((row) => row.id),
  );
  let teamCount = 0;
  let standingCount = 0;

  // Replacing (not merging) keeps repeated runs idempotent: a source that
  // changes its division structure must not leave orphan rows behind.
  const seasonIds = [
    ...new Set(
      dtos.map((dto) =>
        seasonIdFor(competitionIdFor(dto.competitionSlug), ctx.seasonYear),
      ),
    ),
  ];
  if (seasonIds.length > 0) {
    db.delete(standings).where(inArray(standings.seasonId, seasonIds)).run();
  }

  for (const dto of dtos) {
    const { seasonId, competitionId } = ensureSeason(
      db,
      dto.competitionSlug,
      ctx,
    );
    if (!knownTeams.has(dto.teamSlug)) {
      if (!dto.teamName) {
        warnings.push(`standing references unknown team ${dto.teamSlug}`);
        continue;
      }
      ensureTeam(
        db,
        {
          slug: dto.teamSlug,
          name: dto.teamName,
          clubSlug: null,
          clubName: dto.teamName,
          squadName: null,
        },
        ctx,
      );
      knownTeams.add(dto.teamSlug);
      teamCount += 1;
    }

    db.insert(seasonTeams)
      .values({
        id: `${seasonId}:${dto.teamSlug}`,
        seasonId,
        teamId: dto.teamSlug,
      })
      .onConflictDoNothing()
      .run();

    const id = `${seasonId}:${dto.teamSlug}`;
    const values = {
      id,
      seasonId,
      competitionId,
      teamId: dto.teamSlug,
      position: dto.position,
      played: dto.played,
      won: dto.won,
      drawn: dto.drawn,
      lost: dto.lost,
      goalsFor: dto.goalsFor,
      goalsAgainst: dto.goalsAgainst,
      goalDifference: dto.goalDifference,
      points: dto.points,
      sourceId: ctx.sourceId,
      fetchedAt: ctx.fetchedAt,
      parserVersion: ctx.parserVersion,
    };

    db.insert(standings)
      .values(values)
      .onConflictDoUpdate({
        target: [standings.seasonId, standings.teamId],
        set: {
          competitionId: values.competitionId,
          position: values.position,
          played: values.played,
          won: values.won,
          drawn: values.drawn,
          lost: values.lost,
          goalsFor: values.goalsFor,
          goalsAgainst: values.goalsAgainst,
          goalDifference: values.goalDifference,
          points: values.points,
          sourceId: values.sourceId,
          fetchedAt: values.fetchedAt,
          parserVersion: values.parserVersion,
        },
      })
      .run();
    standingCount += 1;
  }

  return { standings: standingCount, teams: teamCount, warnings };
}

export function ingestMatches(
  db: Db,
  dtos: MatchDTO[],
  ctx: IngestContext,
): { matches: number; warnings: string[] } {
  const warnings: string[] = [];
  const knownTeams = new Set(
    db.select({ id: teams.id }).from(teams).all().map((row) => row.id),
  );

  // A season is covered by exactly one source and that source returns the
  // complete fixture list, so replacing the season's matches keeps repeated
  // runs idempotent even when the set of teams changes (or a PDF is re-parsed
  // with a different group).
  const seasonIds = [
    ...new Set(dtos.map((dto) => seasonIdFor(competitionIdFor(dto.competitionSlug), ctx.seasonYear))),
  ];
  if (seasonIds.length > 0) {
    db.delete(matches).where(inArray(matches.seasonId, seasonIds)).run();
  }

  let count = 0;
  for (const dto of dtos) {
    if (!knownTeams.has(dto.homeTeamSlug) || !knownTeams.has(dto.awayTeamSlug)) {
      warnings.push(
        `match ${dto.homeTeamSlug} vs ${dto.awayTeamSlug} skipped: team not registered`,
      );
      continue;
    }
    const { seasonId, competitionId } = ensureSeason(
      db,
      dto.competitionSlug,
      ctx,
    );
    const id = stableId(
      "match",
      seasonId,
      dto.homeTeamSlug,
      dto.awayTeamSlug,
      dto.kickoffAt?.toISOString() ?? "",
      dto.round ?? "",
    );

    const values = {
      id,
      seasonId,
      competitionId,
      homeTeamId: dto.homeTeamSlug,
      awayTeamId: dto.awayTeamSlug,
      kickoffAt: dto.kickoffAt ?? null,
      venue: dto.venue ?? null,
      homeScore: dto.homeScore ?? null,
      awayScore: dto.awayScore ?? null,
      status: dto.status,
      round: dto.round ?? null,
      sourceId: ctx.sourceId,
      fetchedAt: ctx.fetchedAt,
      parserVersion: ctx.parserVersion,
    };

    db.insert(matches)
      .values(values)
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          kickoffAt: values.kickoffAt,
          venue: values.venue,
          homeScore: values.homeScore,
          awayScore: values.awayScore,
          status: values.status,
          round: values.round,
          sourceId: values.sourceId,
          fetchedAt: values.fetchedAt,
          parserVersion: values.parserVersion,
        },
      })
      .run();
    count += 1;
  }

  return { matches: count, warnings };
}

export function registerSeasonTeams(
  db: Db,
  seasonId: string,
  teamIds: string[],
): void {
  if (teamIds.length === 0) return;
  const existing = new Set(
    db
      .select({ teamId: seasonTeams.teamId })
      .from(seasonTeams)
      .where(and(eq(seasonTeams.seasonId, seasonId), inArray(seasonTeams.teamId, teamIds)))
      .all()
      .map((row) => row.teamId),
  );
  for (const teamId of teamIds) {
    if (existing.has(teamId)) continue;
    db.insert(seasonTeams)
      .values({ id: `${seasonId}:${teamId}`, seasonId, teamId })
      .onConflictDoNothing()
      .run();
  }
}
