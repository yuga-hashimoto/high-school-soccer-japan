import {
  DEEP_PREFECTURES,
  PREFECTURES,
  PREFECTURE_BY_SLUG,
} from "@/db/seed/geography";
import { CHUGOKU_SHIKOKU } from "./regions/chugoku-shikoku";
import { HOKKAIDO_TOHOKU } from "./regions/hokkaido-tohoku";
import { HOKUSHINETSU } from "./regions/hokushinetsu";
import { KANSAI } from "./regions/kansai";
import { KANTO } from "./regions/kanto";
import { KYUSHU } from "./regions/kyushu";
import { TOKAI } from "./regions/tokai";
import type { PrefectureSourceInput } from "./regions/types";
import type {
  PrefectureCompetitionConfig,
  PrefectureSourceConfig,
} from "./types";

function divisions(
  slug: string,
  prefectureName: string,
): PrefectureCompetitionConfig[] {
  const out: PrefectureCompetitionConfig[] = [
    {
      slug: `${slug}-1`,
      name: `${prefectureName}1部`,
      level: 4,
      parentSlug: slug,
      sortOrder: 1,
    },
    {
      slug: `${slug}-2`,
      name: `${prefectureName}2部`,
      level: 4,
      parentSlug: slug,
      sortOrder: 2,
    },
  ];
  if (DEEP_PREFECTURES.has(slug)) {
    out.push({
      slug: `${slug}-3`,
      name: `${prefectureName}3部`,
      level: 4,
      parentSlug: slug,
      sortOrder: 3,
    });
  }
  return out;
}

/**
 * Fukuoka is the reference implementation: 4部 is a district league, its
 * districts nest below it, and 2部 splits into A/B groups. These slugs mirror
 * `buildCompetitions()` exactly.
 */
const FUKUOKA_EXTRAS: PrefectureCompetitionConfig[] = [
  {
    slug: "fukuoka-4",
    name: "福岡4部（地区リーグ）",
    level: 5,
    parentSlug: "fukuoka",
    sortOrder: 4,
  },
  {
    slug: "fukuoka-chuo",
    name: "福岡中央地区U-18リーグ",
    level: 6,
    parentSlug: "fukuoka-4",
    sortOrder: 1,
  },
  {
    slug: "fukuoka-kita",
    name: "福岡北地区U-18リーグ",
    level: 6,
    parentSlug: "fukuoka-4",
    sortOrder: 2,
  },
  {
    slug: "kitakyushu",
    name: "北九州地区U-18リーグ",
    level: 6,
    parentSlug: "fukuoka-4",
    sortOrder: 3,
  },
  {
    slug: "chikugo",
    name: "筑後地区U-18リーグ",
    level: 6,
    parentSlug: "fukuoka-4",
    sortOrder: 4,
  },
  {
    slug: "fukuoka-2-a",
    name: "福岡2部 Aグループ",
    level: 5,
    parentSlug: "fukuoka-2",
    sortOrder: 1,
  },
  {
    slug: "fukuoka-2-b",
    name: "福岡2部 Bグループ",
    level: 5,
    parentSlug: "fukuoka-2",
    sortOrder: 2,
  },
];

/**
 * Per-prefecture table, assembled from the regional files. The final catalog is
 * rebuilt by iterating `PREFECTURES`, so order and the 47-item count are
 * guaranteed even if a regional file is edited.
 */
const PREFECTURE_TABLE: PrefectureSourceInput[] = [
  ...HOKKAIDO_TOHOKU,
  ...KANTO,
  ...HOKUSHINETSU,
  ...TOKAI,
  ...KANSAI,
  ...CHUGOKU_SHIKOKU,
  ...KYUSHU,
];

const INPUT_BY_SLUG = new Map(PREFECTURE_TABLE.map((entry) => [entry.slug, entry]));

export const PREFECTURE_SOURCES: PrefectureSourceConfig[] = PREFECTURES.map(
  (prefecture) => {
    const input = INPUT_BY_SLUG.get(prefecture.slug);
    if (!input) {
      throw new Error(
        `missing prefecture source config for "${prefecture.slug}"`,
      );
    }

    const seed = PREFECTURE_BY_SLUG.get(prefecture.slug);
    if (!seed) {
      throw new Error(`unknown prefecture slug "${prefecture.slug}"`);
    }

    const isFukuoka = prefecture.slug === "fukuoka";

    return {
      sourceId: `pref-${prefecture.slug}`,
      prefectureSlug: prefecture.slug,
      name: input.associationName,
      sourceUrl: input.url,
      format: input.format ?? "HTML",
      status: input.status ?? "NEEDS_PARSER",
      updateIntervalMinutes: isFukuoka ? 120 : 720,
      adapter: input.adapter ?? (isFukuoka ? "prefecture-html" : undefined),
      endpoints: input.endpoints,
      competitions: [
        ...divisions(prefecture.slug, prefecture.name),
        ...(input.extras ??
          (prefecture.slug === "fukuoka" ? FUKUOKA_EXTRAS : [])),
      ],
      notes: input.notes ?? null,
      urlVerified: input.urlVerified ?? true,
    };
  },
);

const SOURCE_BY_SLUG = new Map(
  PREFECTURE_SOURCES.map((source) => [source.prefectureSlug, source]),
);

export function getPrefectureSource(
  prefectureSlug: string,
): PrefectureSourceConfig | undefined {
  return SOURCE_BY_SLUG.get(prefectureSlug);
}
