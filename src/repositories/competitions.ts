import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { competitions, dataSources, prefectures, regions, seasons } from "@/db/schema";

export interface CompetitionNode {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  category: string;
  parentCompetitionId: string | null;
  level: number | null;
  sortOrder: number;
  regionId: string | null;
  prefectureId: string | null;
  sourceId: string | null;
  hasSeason: boolean;
}

export interface CompetitionSourceInfo {
  sourceId: string;
  name: string;
  sourceUrl: string;
  status: string;
  format: string;
  notes: string | null;
}

export function listRegions() {
  const db = getDb();
  return db.select().from(regions).orderBy(asc(regions.sortOrder)).all();
}

export function listPrefectures() {
  const db = getDb();
  return db
    .select({
      id: prefectures.id,
      name: prefectures.name,
      slug: prefectures.slug,
      regionId: prefectures.regionId,
      regionName: regions.name,
      regionSlug: regions.slug,
      sortOrder: prefectures.sortOrder,
    })
    .from(prefectures)
    .innerJoin(regions, eq(prefectures.regionId, regions.id))
    .orderBy(asc(prefectures.sortOrder))
    .all();
}

export function getPrefectureBySlug(slug: string) {
  const db = getDb();
  return (
    db
      .select()
      .from(prefectures)
      .where(eq(prefectures.slug, slug))
      .all()[0] ?? null
  );
}

export function getRegionBySlug(slug: string) {
  const db = getDb();
  return db.select().from(regions).where(eq(regions.slug, slug)).all()[0] ?? null;
}

export function getCompetitionBySlug(slug: string) {
  const db = getDb();
  return (
    db.select().from(competitions).where(eq(competitions.slug, slug)).all()[0] ??
    null
  );
}

export function getCompetitionById(id: string) {
  const db = getDb();
  return db.select().from(competitions).where(eq(competitions.id, id)).all()[0] ?? null;
}

export function getCompetitionSource(
  sourceId: string | null,
): CompetitionSourceInfo | null {
  if (!sourceId) return null;
  const db = getDb();
  const row = db
    .select({
      sourceId: dataSources.sourceId,
      name: dataSources.name,
      sourceUrl: dataSources.sourceUrl,
      status: dataSources.status,
      format: dataSources.format,
      notes: dataSources.notes,
    })
    .from(dataSources)
    .where(eq(dataSources.sourceId, sourceId))
    .all()[0];
  return row ?? null;
}

function withSeasonFlag(rows: Array<typeof competitions.$inferSelect>): CompetitionNode[] {
  const db = getDb();
  const seasonRows = db
    .select({ competitionId: seasons.competitionId })
    .from(seasons)
    .all();
  const hasSeason = new Set(seasonRows.map((row) => row.competitionId));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    slug: row.slug,
    category: row.category,
    parentCompetitionId: row.parentCompetitionId,
    level: row.level,
    sortOrder: row.sortOrder,
    regionId: row.regionId,
    prefectureId: row.prefectureId,
    sourceId: row.sourceId,
    hasSeason: hasSeason.has(row.id),
  }));
}

export function listTopLevelCompetitions(category?: string): CompetitionNode[] {
  const db = getDb();
  const where = category
    ? and(isNull(competitions.parentCompetitionId), eq(competitions.category, category))
    : isNull(competitions.parentCompetitionId);
  const rows = db
    .select()
    .from(competitions)
    .where(where)
    .orderBy(asc(competitions.sortOrder))
    .all();
  return withSeasonFlag(rows);
}

export function listCompetitionsByRegion(regionId: string): CompetitionNode[] {
  const db = getDb();
  const rows = db
    .select()
    .from(competitions)
    .where(and(eq(competitions.regionId, regionId), isNull(competitions.parentCompetitionId)))
    .orderBy(asc(competitions.sortOrder))
    .all();
  return withSeasonFlag(rows);
}

export function listCompetitionsByPrefecture(prefectureId: string): CompetitionNode[] {
  const db = getDb();
  const rows = db
    .select()
    .from(competitions)
    .where(
      and(
        eq(competitions.prefectureId, prefectureId),
        isNull(competitions.parentCompetitionId),
      ),
    )
    .orderBy(asc(competitions.sortOrder))
    .all();
  return withSeasonFlag(rows);
}

export function listChildren(parentId: string): CompetitionNode[] {
  const db = getDb();
  const rows = db
    .select()
    .from(competitions)
    .where(eq(competitions.parentCompetitionId, parentId))
    .orderBy(asc(competitions.sortOrder))
    .all();
  return withSeasonFlag(rows);
}

/** Loads a competition and every descendant, breadth first. */
export function getCompetitionSubtree(rootId: string): CompetitionNode[] {
  const db = getDb();
  const all = db.select().from(competitions).orderBy(asc(competitions.sortOrder)).all();
  const byId = new Map(all.map((row) => [row.id, row]));
  const childrenOf = new Map<string, typeof all>();
  for (const row of all) {
    if (!row.parentCompetitionId) continue;
    const bucket = childrenOf.get(row.parentCompetitionId) ?? [];
    bucket.push(row);
    childrenOf.set(row.parentCompetitionId, bucket);
  }

  const ordered: typeof all = [];
  const visit = (id: string) => {
    const row = byId.get(id);
    if (!row) return;
    ordered.push(row);
    for (const child of childrenOf.get(id) ?? []) visit(child.id);
  };
  visit(rootId);
  return withSeasonFlag(ordered);
}

export interface Breadcrumb {
  id: string;
  name: string;
  slug: string;
}

export function getBreadcrumbs(competitionId: string): Breadcrumb[] {
  const db = getDb();
  const chain: Breadcrumb[] = [];
  let currentId: string | null = competitionId;
  const guard = new Set<string>();
  while (currentId && !guard.has(currentId)) {
    guard.add(currentId);
    const row: typeof competitions.$inferSelect | undefined = db
      .select()
      .from(competitions)
      .where(eq(competitions.id, currentId))
      .all()[0];
    if (!row) break;
    chain.unshift({ id: row.id, name: row.name, slug: row.slug });
    currentId = row.parentCompetitionId;
  }
  return chain;
}

export function getLatestSeason(competitionId: string, year?: number) {
  const db = getDb();
  if (year !== undefined) {
    return (
      db
        .select()
        .from(seasons)
        .where(and(eq(seasons.competitionId, competitionId), eq(seasons.year, year)))
        .all()[0] ?? null
    );
  }
  return (
    db
      .select()
      .from(seasons)
      .where(eq(seasons.competitionId, competitionId))
      .orderBy(sql`${seasons.year} desc`)
      .all()[0] ?? null
  );
}

/** Resolves a competition or any of its descendants that actually has data. */
export function findSeasonsInSubtree(rootId: string) {
  const db = getDb();
  const subtree = getCompetitionSubtree(rootId).map((node) => node.id);
  if (subtree.length === 0) return [];
  return db
    .select({
      seasonId: seasons.id,
      year: seasons.year,
      competitionId: seasons.competitionId,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
    })
    .from(seasons)
    .innerJoin(competitions, eq(seasons.competitionId, competitions.id))
    .where(inArray(seasons.competitionId, subtree))
    .orderBy(asc(competitions.sortOrder))
    .all();
}

export function competitionHasData(competitionId: string): boolean {
  const db = getDb();
  return (
    db.select({ id: seasons.id }).from(seasons).where(eq(seasons.competitionId, competitionId)).all()
      .length > 0
  );
}

/** Competitions filtered by ids, used for favourites and history lists. */
export function listCompetitionsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(competitions)
    .where(inArray(competitions.id, ids))
    .all();
}
