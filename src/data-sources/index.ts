import { PREFECTURES, REGIONS } from "@/db/seed/geography";
import { seasonYearFromEnv } from "@/lib/season";
import { buildJfaAdapters, PRINCE_UNPUBLISHED } from "./jfa/sources";
import { createPrefectureAdapter } from "./prefectures";
import { PREFECTURE_SOURCES } from "./prefectures/catalog";
import { registry } from "./registry";
import type { LeagueDataSource } from "./types";
import { UnavailableAdapter } from "./unavailable";

const PREFECTURE_REGION = new Map(
  PREFECTURES.map((prefecture) => [
    prefecture.slug,
    prefecture.regionId.replace(/^region-/, ""),
  ]),
);

let registered = false;

interface ContainerOptions {
  sourceId: string;
  name: string;
  scope: "NATIONAL" | "REGION";
  regionSlug: string | null;
  sourceUrl: string;
  format: "JSON" | "HTML" | "CSV" | "PDF";
  notes: string;
}

function registerContainer(options: ContainerOptions): void {
  registry.register({
    sourceId: options.sourceId,
    name: options.name,
    scope: options.scope,
    regionSlug: options.regionSlug,
    prefectureSlug: null,
    sourceUrl: options.sourceUrl,
    format: options.format,
    status: "ACTIVE",
    enabled: false,
    updateIntervalMinutes: 0,
    adapter: "aggregate",
    notes: options.notes,
    adapterInstance: null,
  });
}

/**
 * Registers every known source exactly once. All 47 prefectures plus the
 * national Premier/Prince tiers are present, including those whose parser is
 * not written yet, so nationwide coverage is always auditable.
 */
export function registerAllSources(options?: { reset?: boolean }): void {
  if (registered && !options?.reset) return;
  if (options?.reset) registry.clear();
  registered = true;

  const seasonYear = seasonYearFromEnv();

  for (const adapter of buildJfaAdapters(seasonYear)) {
    registry.register({
      sourceId: adapter.sourceId,
      name: adapter.sourceName,
      scope: adapter.config.regionSlug ? "REGION" : "NATIONAL",
      regionSlug: adapter.config.regionSlug ?? null,
      prefectureSlug: adapter.config.prefectureSlug ?? null,
      sourceUrl: adapter.sourceUrl,
      format: "JSON",
      status: "ACTIVE",
      enabled: true,
      updateIntervalMinutes: adapter.config.category === "PREMIER" ? 60 : 120,
      adapter: "jfa-json",
      notes: adapter.config.notes ?? "JFA公式JSON（fight.json / schedule.json）",
      adapterInstance: adapter,
    });
  }

  for (const block of PRINCE_UNPUBLISHED) {
    const sourceId = `jfa-prince-${block.regionSlug}`;
    const sourceUrl = `https://www.jfa.jp/match/takamado_jfa_u18_prince2026/${block.regionSlug}/`;
    registry.register({
      sourceId,
      name: `JFA プリンスリーグ ${block.regionName}`,
      scope: "REGION",
      regionSlug: block.regionSlug,
      prefectureSlug: null,
      sourceUrl,
      format: "HTML",
      status: "NEEDS_PARSER",
      enabled: true,
      updateIntervalMinutes: 720,
      adapter: "needs-parser",
      notes: "全国サイトに今季のページが未公開のため未取得",
      adapterInstance: new UnavailableAdapter({
        sourceId,
        sourceName: `JFA プリンスリーグ ${block.regionName}`,
        sourceUrl,
        reason: "プリンスリーグ東北の今季ページが全国サイトに未公開",
      }),
    });
  }

  for (const config of PREFECTURE_SOURCES) {
    const adapter: LeagueDataSource = createPrefectureAdapter(config);
    registry.register({
      sourceId: config.sourceId,
      name: config.name,
      scope: "PREFECTURE",
      regionSlug: PREFECTURE_REGION.get(config.prefectureSlug) ?? null,
      prefectureSlug: config.prefectureSlug,
      sourceUrl: config.sourceUrl,
      format: config.format,
      status: config.status,
      enabled: true,
      updateIntervalMinutes: config.updateIntervalMinutes,
      adapter: config.adapter ?? "needs-parser",
      notes: config.notes ?? null,
      adapterInstance: adapter,
    });
  }

  // Container sources are registered last: a competition group can be backed
  // by several concrete sources (for example プリンスリーグ関東 1部/2部). They
  // carry provenance for the parent node but are never run directly, and are
  // skipped when a real source already owns the id.
  registerContainer({
    sourceId: "jfa-premier",
    name: "JFA プレミアリーグ",
    scope: "NATIONAL",
    regionSlug: null,
    sourceUrl: "https://www.jfa.jp/match/takamado_jfa_u18_premier/",
    format: "JSON",
    notes: "EAST/WESTを束ねる大会コンテナ",
  });

  for (const region of REGIONS) {
    const containerId = `jfa-prince-${region.slug}`;
    if (registry.get(containerId)) continue;
    registerContainer({
      sourceId: containerId,
      name: `JFA プリンスリーグ ${region.name}`,
      scope: "REGION",
      regionSlug: region.slug,
      sourceUrl: `https://www.jfa.jp/match/takamado_jfa_u18_prince2026/${region.slug}/`,
      format: "HTML",
      notes: "各ブロックの1部・2部を束ねる大会コンテナ",
    });
  }
}

export { registry };
export type { LeagueDataSource };
export { REGIONS, PREFECTURES };
