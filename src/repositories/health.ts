import { asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  competitions,
  dataHealth,
  dataSources,
  matches,
  prefectures,
  regions,
  standings,
  teams,
} from "@/db/schema";

export interface SourceHealthRow {
  sourceId: string;
  name: string;
  scope: string;
  adapter: string;
  format: string;
  sourceUrl: string;
  status: string;
  enabled: boolean;
  updateIntervalMinutes: number;
  regionName: string | null;
  prefectureName: string | null;
  healthStatus: string;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  lastError: string | null;
  teamCount: number;
  matchCount: number;
  competitionCount: number;
  notes: string | null;
}

export function listSourceHealth(): SourceHealthRow[] {
  const db = getDb();
  const rows = db
    .select({
      sourceId: dataSources.sourceId,
      name: dataSources.name,
      scope: dataSources.scope,
      adapter: dataSources.adapter,
      format: dataSources.format,
      sourceUrl: dataSources.sourceUrl,
      status: dataSources.status,
      enabled: dataSources.enabled,
      updateIntervalMinutes: dataSources.updateIntervalMinutes,
      regionName: regions.name,
      prefectureName: prefectures.name,
      healthStatus: dataHealth.status,
      lastSuccessAt: dataHealth.lastSuccessAt,
      lastAttemptAt: dataHealth.lastAttemptAt,
      lastError: dataHealth.lastError,
      teamCount: dataHealth.teamCount,
      matchCount: dataHealth.matchCount,
      competitionCount: dataHealth.competitionCount,
      notes: dataSources.notes,
    })
    .from(dataSources)
    .leftJoin(regions, eq(dataSources.regionId, regions.id))
    .leftJoin(prefectures, eq(dataSources.prefectureId, prefectures.id))
    .leftJoin(dataHealth, eq(dataHealth.sourceId, dataSources.sourceId))
    .orderBy(asc(dataSources.sourceId))
    .all();

  return rows.map((row) => ({
    ...row,
    enabled: Boolean(row.enabled),
    healthStatus: row.healthStatus ?? "UNKNOWN",
    lastSuccessAt: row.lastSuccessAt ?? null,
    lastAttemptAt: row.lastAttemptAt ?? null,
    lastError: row.lastError ?? null,
    teamCount: row.teamCount ?? 0,
    matchCount: row.matchCount ?? 0,
    competitionCount: row.competitionCount ?? 0,
    regionName: row.regionName ?? null,
    prefectureName: row.prefectureName ?? null,
    notes: row.notes ?? null,
  }));
}

export type CoverageClass = "OK" | "PARTIAL" | "MISSING" | "FAILED";

export interface CoverageBucket {
  total: number;
  ok: number;
  partial: number;
  missing: number;
  failed: number;
  perClass: Record<CoverageClass, string[]>;
}

export interface RegionCoverage extends CoverageBucket {
  regionSlug: string;
  regionName: string;
}

export interface CoverageSummary {
  all: CoverageBucket;
  prefectures: CoverageBucket;
  regions: RegionCoverage[];
  tiers: {
    premier: CoverageBucket;
    prince: CoverageBucket;
    prefecture: CoverageBucket;
  };
  totals: {
    teams: number;
    matches: number;
    standings: number;
    competitions: number;
  };
}

function classify(status: string, health: string): CoverageClass {
  if (status === "ERROR" || health === "FAILED") return "FAILED";
  if (status === "ACTIVE" || health === "OK" || health === "PARTIAL") return "OK";
  if (status === "PARTIAL") return "PARTIAL";
  if (status === "NEEDS_PARSER" || status === "UNSUPPORTED") return "MISSING";
  return "MISSING";
}

function emptyBucket(): CoverageBucket {
  return {
    total: 0,
    ok: 0,
    partial: 0,
    missing: 0,
    failed: 0,
    perClass: { OK: [], PARTIAL: [], MISSING: [], FAILED: [] },
  };
}

function addToBucket(bucket: CoverageBucket, label: string, cls: CoverageClass): void {
  bucket.total += 1;
  bucket.perClass[cls].push(label);
  if (cls === "OK") bucket.ok += 1;
  else if (cls === "PARTIAL") bucket.partial += 1;
  else if (cls === "MISSING") bucket.missing += 1;
  else bucket.failed += 1;
}

export function getCoverageSummary(): CoverageSummary {
  const db = getDb();
  const rows = db
    .select({
      sourceId: dataSources.sourceId,
      name: dataSources.name,
      scope: dataSources.scope,
      regionSlug: regions.slug,
      regionName: regions.name,
      prefectureSlug: prefectures.slug,
      prefectureName: prefectures.name,
      status: dataSources.status,
      healthStatus: dataHealth.status,
      teamCount: dataHealth.teamCount,
      matchCount: dataHealth.matchCount,
    })
    .from(dataSources)
    .leftJoin(regions, eq(dataSources.regionId, regions.id))
    .leftJoin(prefectures, eq(dataSources.prefectureId, prefectures.id))
    .leftJoin(dataHealth, eq(dataHealth.sourceId, dataSources.sourceId))
    .all();

  const all = emptyBucket();
  const prefectureBucket = emptyBucket();
  const premier = emptyBucket();
  const prince = emptyBucket();
  const regionMap = new Map<string, RegionCoverage>();

  for (const row of rows) {
    // Containers are structural, not fetchable units, and the bundled sample
    // data is not a real information source.
    if (
      row.sourceId === "seed-demo" ||
      row.sourceId === "jfa-premier" ||
      /^jfa-prince-[a-z]+$/.test(row.sourceId)
    ) {
      continue;
    }
    const cls = classify(row.status, row.healthStatus ?? "UNKNOWN");
    addToBucket(all, row.sourceId, cls);

    const tier =
      row.scope === "PREFECTURE"
        ? prefectureBucket
        : row.sourceId.startsWith("jfa-premier")
          ? premier
          : row.sourceId.startsWith("jfa-prince")
            ? prince
            : null;
    if (tier) addToBucket(tier, row.name, cls);

    if (row.regionSlug && row.regionName) {
      const bucket =
        regionMap.get(row.regionSlug) ??
        (() => {
          const created: RegionCoverage = {
            ...emptyBucket(),
            regionSlug: row.regionSlug as string,
            regionName: row.regionName as string,
          };
          regionMap.set(row.regionSlug as string, created);
          return created;
        })();
      addToBucket(bucket, row.name, cls);
    }
  }

  const standingsCount = db.select({ value: count() }).from(standings).all()[0]?.value;
  const teamsCount = db.select({ value: count() }).from(teams).all()[0]?.value;
  const matchesCount = db.select({ value: count() }).from(matches).all()[0]?.value;
  const competitionsCount = db
    .select({ value: count() })
    .from(competitions)
    .all()[0]?.value;

  return {
    all,
    prefectures: prefectureBucket,
    regions: [...regionMap.values()].sort((a, b) => a.regionSlug.localeCompare(b.regionSlug)),
    tiers: { premier, prince, prefecture: prefectureBucket },
    totals: {
      teams: Number(teamsCount ?? 0),
      matches: Number(matchesCount ?? 0),
      standings: Number(standingsCount ?? 0),
      competitions: Number(competitionsCount ?? 0),
    },
  };
}

export function getRecentFailures(): SourceHealthRow[] {
  return listSourceHealth().filter(
    (row) => row.healthStatus === "FAILED" || row.status === "ERROR",
  );
}

export function getStaleSources(now = new Date()): SourceHealthRow[] {
  return listSourceHealth().filter((row) => {
    if (!row.enabled) return false;
    if (row.updateIntervalMinutes <= 0) return false;
    if (!row.lastSuccessAt) return true;
    const ageMinutes = (now.getTime() - row.lastSuccessAt.getTime()) / 60000;
    return ageMinutes > row.updateIntervalMinutes * 2;
  });
}
