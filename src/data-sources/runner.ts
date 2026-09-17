import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { dataHealth, dataSources } from "@/db/schema";
import { isExpectedSourceFailure } from "./errors";
import {
  ingestCompetitions,
  ingestMatches,
  ingestStandings,
  ingestTeams,
  type IngestContext,
} from "@/repositories/ingest";
import { registry } from "./registry";
import type { LeagueDataSource } from "./types";

export type RunStatus = "OK" | "PARTIAL" | "FAILED" | "NEEDS_PARSER" | "SKIPPED";

export interface RunSourceResult {
  sourceId: string;
  sourceName: string;
  status: RunStatus;
  seasonYear: number;
  competitions: number;
  teams: number;
  matches: number;
  standings: number;
  warnings: string[];
  errors: string[];
  durationMs: number;
  attemptedAt: Date;
  lastSuccessAt: Date | null;
}

export interface RunSourceOptions {
  seasonYear: number;
  db?: Db;
  /**
   * Skip a source whose last successful update is still inside its refresh
   * interval. This is how "a few times a day normally, roughly hourly on match
   * days" is enforced without hammering the upstream sites.
   */
  respectInterval?: boolean;
}

/**
 * Runs one source end to end and persists what it returns. Failures are
 * contained: the previous data is left untouched, the error is recorded, and
 * the caller is never thrown at. That is what lets one prefecture fail without
 * affecting the other 46.
 */
export async function runSource(
  sourceId: string,
  options: RunSourceOptions,
): Promise<RunSourceResult> {
  const db = options.db ?? getDb();
  const startedAt = Date.now();
  const attemptedAt = new Date();

  const entry = registry.get(sourceId);
  const base: RunSourceResult = {
    sourceId,
    sourceName: entry?.name ?? sourceId,
    status: "FAILED",
    seasonYear: options.seasonYear,
    competitions: 0,
    teams: 0,
    matches: 0,
    standings: 0,
    warnings: [],
    errors: [],
    durationMs: 0,
    attemptedAt,
    lastSuccessAt: null,
  };

  if (!entry) {
    base.errors.push(`source "${sourceId}" is not registered`);
    base.durationMs = Date.now() - startedAt;
    return base;
  }
  if (!entry.enabled) {
    base.status = "SKIPPED";
    base.durationMs = Date.now() - startedAt;
    return base;
  }

  if (options.respectInterval && entry.updateIntervalMinutes > 0) {
    const existing = db
      .select({ lastSuccessAt: dataHealth.lastSuccessAt })
      .from(dataHealth)
      .where(eq(dataHealth.sourceId, sourceId))
      .all()[0];
    if (existing?.lastSuccessAt) {
      const ageMinutes = (attemptedAt.getTime() - existing.lastSuccessAt.getTime()) / 60000;
      if (ageMinutes < entry.updateIntervalMinutes) {
        base.status = "SKIPPED";
        base.lastSuccessAt = existing.lastSuccessAt;
        base.warnings.push(
          `last success ${Math.round(ageMinutes)}m ago, interval is ${entry.updateIntervalMinutes}m`,
        );
        base.durationMs = Date.now() - startedAt;
        return base;
      }
    }
  }

  const adapter: LeagueDataSource | null = entry.adapterInstance;
  if (!adapter) {
    base.status = "NEEDS_PARSER";
    base.errors.push("adapter is not implemented");
    await recordHealth(db, sourceId, {
      status: "UNKNOWN",
      attemptedAt,
      error: "adapter is not implemented",
      counts: { teams: 0, matches: 0, competitions: 0 },
      parserVersion: null,
    });
    base.durationMs = Date.now() - startedAt;
    return base;
  }

  const ctx: IngestContext = {
    sourceId,
    parserVersion: adapter.parserVersion,
    fetchedAt: attemptedAt,
    seasonYear: options.seasonYear,
  };

  let succeeded = 0;
  let failed = 0;

  const step = async <T>(
    label: string,
    run: () => Promise<T>,
    apply: (value: T) => void,
  ): Promise<void> => {
    try {
      const value = await run();
      apply(value);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      base.errors.push(`${label}: ${message}`);
      if (error instanceof Error && isExpectedSourceFailure(error)) {
        base.warnings.push(`${label}: parser not available`);
      }
    }
  };

  await step(
    "competitions",
    () => adapter.getCompetitions({ seasonYear: options.seasonYear }),
    (sourced) => {
      base.competitions = ingestCompetitions(db, sourced.data, ctx);
    },
  );

  await step(
    "teams",
    () => adapter.getTeams({ seasonYear: options.seasonYear }),
    (sourced) => {
      base.teams = ingestTeams(db, sourced.data, ctx);
    },
  );

  await step(
    "standings",
    () => adapter.getStandings({ seasonYear: options.seasonYear }),
    (sourced) => {
      const result = ingestStandings(db, sourced.data, ctx);
      base.standings = result.standings;
      base.teams += result.teams;
      base.warnings.push(...result.warnings);
    },
  );

  await step(
    "matches",
    () => adapter.getMatches({ seasonYear: options.seasonYear }),
    (sourced) => {
      const result = ingestMatches(db, sourced.data, ctx);
      base.matches = result.matches;
      base.warnings.push(...result.warnings);
    },
  );

  if (failed === 0) base.status = "OK";
  else if (succeeded > 0) base.status = "PARTIAL";
  else if (base.warnings.length > 0) base.status = "NEEDS_PARSER";
  else base.status = "FAILED";

  const lastSuccessAt = base.status === "OK" || base.status === "PARTIAL" ? attemptedAt : null;

  await recordHealth(db, sourceId, {
    status:
      base.status === "OK" ? "OK" : base.status === "PARTIAL" ? "PARTIAL" : base.status === "NEEDS_PARSER" ? "UNKNOWN" : "FAILED",
    attemptedAt,
    error: base.errors.length > 0 ? base.errors.join("; ") : null,
    counts: {
      teams: base.teams,
      matches: base.matches,
      competitions: base.competitions,
    },
    parserVersion: adapter.parserVersion,
    lastSuccessAt: lastSuccessAt ?? undefined,
  });

  base.lastSuccessAt = lastSuccessAt;
  base.durationMs = Date.now() - startedAt;
  return base;
}

interface HealthUpdate {
  status: string;
  attemptedAt: Date;
  error: string | null;
  counts: { teams: number; matches: number; competitions: number };
  parserVersion: string | null;
  lastSuccessAt?: Date;
}

async function recordHealth(
  db: Db,
  sourceId: string,
  update: HealthUpdate,
): Promise<void> {
  const existing = db
    .select()
    .from(dataHealth)
    .where(eq(dataHealth.sourceId, sourceId))
    .all()[0];

  const lastSuccessAt =
    update.lastSuccessAt ?? existing?.lastSuccessAt ?? null;

  if (existing) {
    db.update(dataHealth)
      .set({
        status: update.status,
        lastAttemptAt: update.attemptedAt,
        lastSuccessAt,
        lastError: update.error,
        teamCount: update.counts.teams,
        matchCount: update.counts.matches,
        competitionCount: update.counts.competitions,
        parserVersion: update.parserVersion,
        updatedAt: new Date(),
      })
      .where(eq(dataHealth.sourceId, sourceId))
      .run();
  } else {
    db.insert(dataHealth)
      .values({
        sourceId,
        status: update.status,
        lastAttemptAt: update.attemptedAt,
        lastSuccessAt,
        lastError: update.error,
        teamCount: update.counts.teams,
        matchCount: update.counts.matches,
        competitionCount: update.counts.competitions,
        parserVersion: update.parserVersion,
        updatedAt: new Date(),
      })
      .run();
  }

  const sourceStatus =
    update.status === "OK"
      ? "ACTIVE"
      : update.status === "PARTIAL"
        ? "PARTIAL"
        : update.status === "UNKNOWN"
          ? "NEEDS_PARSER"
          : "ERROR";

  db.update(dataSources)
    .set({ status: sourceStatus })
    .where(eq(dataSources.sourceId, sourceId))
    .run();
}

export interface RunManyResult {
  results: RunSourceResult[];
  ok: number;
  partial: number;
  failed: number;
  needsParser: number;
  skipped: number;
}

/** Runs a set of sources with bounded concurrency, isolating every failure. */
export async function runSources(
  sourceIds: string[],
  options: RunSourceOptions & { concurrency?: number },
): Promise<RunManyResult> {
  const db = options.db ?? getDb();
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const queue = [...sourceIds];
  const results: RunSourceResult[] = [];

  async function worker(): Promise<void> {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      try {
        results.push(
          await runSource(next, {
            seasonYear: options.seasonYear,
            db,
            respectInterval: options.respectInterval,
          }),
        );
      } catch (error) {
        results.push({
          sourceId: next,
          sourceName: next,
          status: "FAILED",
          seasonYear: options.seasonYear,
          competitions: 0,
          teams: 0,
          matches: 0,
          standings: 0,
          warnings: [],
          errors: [error instanceof Error ? error.message : String(error)],
          durationMs: 0,
          attemptedAt: new Date(),
          lastSuccessAt: null,
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length || 1) }, worker),
  );

  return {
    results,
    ok: results.filter((r) => r.status === "OK").length,
    partial: results.filter((r) => r.status === "PARTIAL").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    needsParser: results.filter((r) => r.status === "NEEDS_PARSER").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
  };
}

export function resolveSourceIds(selector: string): string[] {
  if (selector === "all") {
    return registry.list().map((entry) => entry.sourceId);
  }
  if (selector === "national") {
    return registry
      .list()
      .filter((entry) => entry.scope === "NATIONAL" || entry.scope === "REGION")
      .map((entry) => entry.sourceId);
  }
  if (selector.startsWith("pref:")) {
    const slug = selector.slice("pref:".length);
    return registry.byPrefecture(slug).map((entry) => entry.sourceId);
  }
  if (selector.startsWith("source:")) {
    return [selector.slice("source:".length)];
  }
  return registry.byPrefecture(selector).map((entry) => entry.sourceId);
}
