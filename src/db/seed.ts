import { getDb } from "@/db/client";
import {
  clubs,
  competitions,
  dataHealth,
  dataSources,
  matches,
  prefectures,
  regions,
  seasons,
  seasonTeams,
  standings,
  teams,
} from "@/db/schema";
import { registerAllSources, registry } from "@/data-sources";
import { seasonYearFromEnv } from "@/lib/season";
import {
  ingestMatches,
  ingestStandings,
  ingestTeams,
  type IngestContext,
} from "@/repositories/ingest";
import { buildDemoLeague, DEMO_COMPETITIONS } from "./seed/demo";
import { buildCompetitions, PREFECTURES, REGIONS } from "./seed/geography";

const DEMO_SOURCE_ID = "seed-demo";

function reset(db: ReturnType<typeof getDb>): void {
  db.delete(matches).run();
  db.delete(standings).run();
  db.delete(seasonTeams).run();
  db.delete(seasons).run();
  db.delete(competitions).run();
  db.delete(teams).run();
  db.delete(clubs).run();
  db.delete(dataHealth).run();
  db.delete(dataSources).run();
  db.delete(prefectures).run();
  db.delete(regions).run();
}

export function seed(): void {
  const db = getDb();
  registerAllSources({ reset: true });

  reset(db);

  db.insert(regions)
    .values(REGIONS.map((region) => ({ ...region })))
    .run();

  db.insert(prefectures)
    .values(
      PREFECTURES.map((prefecture) => ({
        id: prefecture.id,
        regionId: prefecture.regionId,
        name: prefecture.name,
        slug: prefecture.slug,
        sortOrder: prefecture.sortOrder,
      })),
    )
    .run();

  const sourceRows = registry.list().map((entry) => ({
    sourceId: entry.sourceId,
    name: entry.name,
    scope: entry.scope,
    regionId: entry.regionSlug ? `region-${entry.regionSlug}` : null,
    prefectureId: entry.prefectureSlug ? `pref-${entry.prefectureSlug}` : null,
    adapter: entry.adapter,
    format: entry.format,
    enabled: entry.enabled,
    status: entry.status,
    updateIntervalMinutes: entry.updateIntervalMinutes,
    sourceUrl: entry.sourceUrl,
    notes: entry.notes,
  }));

  sourceRows.push({
    sourceId: DEMO_SOURCE_ID,
    name: "初期サンプルデータ",
    scope: "NATIONAL",
    regionId: null,
    prefectureId: null,
    adapter: "seed",
    format: "JSON",
    enabled: false,
    status: "PARTIAL",
    updateIntervalMinutes: 0,
    sourceUrl: "https://www.jfa.jp/",
    notes:
      "初回起動時に画面を確認できるよう同梱したサンプル。npm run job:update -- --all を実行すると公式データで上書きされます。",
  });

  db.insert(dataSources).values(sourceRows).run();

  db.insert(competitions)
    .values(
      buildCompetitions().map((competition) => ({
        id: competition.id,
        name: competition.name,
        shortName: competition.shortName,
        slug: competition.slug,
        category: competition.category,
        parentCompetitionId: competition.parentId,
        regionId: competition.regionId,
        prefectureId: competition.prefectureId,
        level: competition.level,
        sortOrder: competition.sortOrder,
        sourceId: competition.sourceId,
      })),
    )
    .run();

  const seasonYear = seasonYearFromEnv();
  const ctx: IngestContext = {
    sourceId: DEMO_SOURCE_ID,
    parserVersion: "seed-demo@1.0.0",
    fetchedAt: new Date(),
    seasonYear,
  };

  let demoTeams = 0;
  let demoStandings = 0;
  let demoMatches = 0;

  for (const competition of DEMO_COMPETITIONS) {
    const league = buildDemoLeague({ ...competition, seasonYear });
    demoTeams += ingestTeams(db, league.teams, ctx);
    demoStandings += ingestStandings(db, league.standings, ctx).standings;
    demoMatches += ingestMatches(db, league.matches, ctx).matches;
  }

  db.insert(dataHealth)
    .values({
      sourceId: DEMO_SOURCE_ID,
      status: "PARTIAL",
      lastAttemptAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      teamCount: demoTeams,
      matchCount: demoMatches,
      competitionCount: 0,
      parserVersion: ctx.parserVersion,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dataHealth.sourceId,
      set: {
        status: "PARTIAL",
        lastAttemptAt: new Date(),
        lastSuccessAt: new Date(),
        teamCount: demoTeams,
        matchCount: demoMatches,
        updatedAt: new Date(),
      },
    })
    .run();

  const summary = {
    regions: db.select().from(regions).all().length,
    prefectures: db.select().from(prefectures).all().length,
    competitions: db.select().from(competitions).all().length,
    sources: db.select().from(dataSources).all().length,
    demoTeams,
    demoStandings,
    teams: db.select().from(teams).all().length,
    standings: db.select().from(standings).all().length,
    matches: db.select().from(matches).all().length,
  };

  console.log("seed complete", summary);
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"));

if (isMain) {
  seed();
}
