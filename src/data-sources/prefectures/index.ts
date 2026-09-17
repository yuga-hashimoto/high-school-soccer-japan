import { getPrefectureSource, PREFECTURE_SOURCES } from "./catalog";
import { NeedsParserAdapter, PrefectureHtmlAdapter } from "./generic-html";
import { PrefecturePdfAdapter } from "./pdf-adapter";
import type { PrefectureSourceConfig } from "./types";
import type { LeagueDataSource } from "../types";

export * from "./types";
export { PREFECTURE_SOURCES, getPrefectureSource };

/**
 * Builds one adapter per registered prefecture. A source with an implemented
 * parser becomes a live adapter; everything else becomes a `NeedsParserAdapter`
 * so the runner records `NEEDS_PARSER` instead of reporting false success.
 */
export function buildPrefectureAdapters(): LeagueDataSource[] {
  return PREFECTURE_SOURCES.map(createPrefectureAdapter);
}

export function createPrefectureAdapter(
  config: PrefectureSourceConfig,
): LeagueDataSource {
  if (config.adapter === "prefecture-html") {
    return new PrefectureHtmlAdapter(config);
  }
  if (config.adapter === "prefecture-pdf") {
    return new PrefecturePdfAdapter(config);
  }
  return new NeedsParserAdapter(config);
}

export function getPrefectureAdapter(
  prefectureSlug: string,
): LeagueDataSource | undefined {
  const config = getPrefectureSource(prefectureSlug);
  return config ? createPrefectureAdapter(config) : undefined;
}
