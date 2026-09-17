import { currentSeasonYear } from "@/lib/season";
import { JfaJsonAdapter, type JfaJsonSourceConfig } from "./json-adapter";

const JFA_ORIGIN = "https://www.jfa.jp";
const PREMIER_DIR = "/match/takamado_jfa_u18_premier2026";
const PRINCE_DIR = "takamado_jfa_u18_prince2026";

interface PrinceGroup {
  /** Group directory inside the 47FA tournament, "" for a single division. */
  group: string;
  /** Registry source id for this division. */
  sourceId: string;
  competitionSlug: string;
  label: string;
}

interface PrinceBlock {
  regionSlug: string;
  regionName: string;
  /** JFA 47FA directory, e.g. "109_kyushu". */
  dir: string;
  groups: PrinceGroup[];
}

/**
 * Prince league blocks as published on JFA's 47FA subsite. 東北 is not
 * published there for this season, so it is registered as NEEDS_PARSER in the
 * registry rather than being silently dropped.
 */
export const PRINCE_BLOCKS: PrinceBlock[] = [
  {
    regionSlug: "hokkaido",
    regionName: "北海道",
    dir: "101_hokkaido",
    groups: [
      {
        group: "",
        sourceId: "jfa-prince-hokkaido-1",
        competitionSlug: "prince-hokkaido-1",
        label: "1部",
      },
    ],
  },
  {
    regionSlug: "kanto",
    regionName: "関東",
    dir: "103_kanto",
    groups: [
      {
        group: "kanto1",
        sourceId: "jfa-prince-kanto-1",
        competitionSlug: "prince-kanto-1",
        label: "1部",
      },
      {
        group: "kanto2",
        sourceId: "jfa-prince-kanto-2",
        competitionSlug: "prince-kanto-2",
        label: "2部",
      },
    ],
  },
  {
    regionSlug: "hokushinetsu",
    regionName: "北信越",
    dir: "104_hokushinetsu",
    groups: [
      {
        group: "hokushinetsu1",
        sourceId: "jfa-prince-hokushinetsu-1",
        competitionSlug: "prince-hokushinetsu-1",
        label: "1部",
      },
      {
        group: "hokushinetsu2",
        sourceId: "jfa-prince-hokushinetsu-2",
        competitionSlug: "prince-hokushinetsu-2",
        label: "2部",
      },
    ],
  },
  {
    regionSlug: "tokai",
    regionName: "東海",
    dir: "105_tokai",
    groups: [
      {
        group: "",
        sourceId: "jfa-prince-tokai-1",
        competitionSlug: "prince-tokai-1",
        label: "1部",
      },
    ],
  },
  {
    regionSlug: "kansai",
    regionName: "関西",
    dir: "106_kansai",
    groups: [
      {
        group: "kansai1",
        sourceId: "jfa-prince-kansai-1",
        competitionSlug: "prince-kansai-1",
        label: "1部",
      },
      {
        group: "kansai2",
        sourceId: "jfa-prince-kansai-2",
        competitionSlug: "prince-kansai-2",
        label: "2部",
      },
    ],
  },
  {
    regionSlug: "chugoku",
    regionName: "中国",
    dir: "107_chugoku",
    groups: [
      {
        group: "",
        sourceId: "jfa-prince-chugoku-1",
        competitionSlug: "prince-chugoku-1",
        label: "1部",
      },
    ],
  },
  {
    regionSlug: "shikoku",
    regionName: "四国",
    dir: "108_shikoku",
    groups: [
      {
        group: "",
        sourceId: "jfa-prince-shikoku-1",
        competitionSlug: "prince-shikoku-1",
        label: "1部",
      },
    ],
  },
  {
    regionSlug: "kyushu",
    regionName: "九州",
    dir: "109_kyushu",
    groups: [
      {
        group: "kyushu1",
        sourceId: "jfa-prince-kyushu-1",
        competitionSlug: "prince-kyushu-1",
        label: "1部",
      },
      {
        group: "kyushu2",
        sourceId: "jfa-prince-kyushu-2",
        competitionSlug: "prince-kyushu-2",
        label: "2部",
      },
    ],
  },
];

/** Prince regions that have no published national endpoint this season. */
export const PRINCE_UNPUBLISHED: Array<{ regionSlug: string; regionName: string }> = [
  { regionSlug: "tohoku", regionName: "東北" },
];

export function buildPremierConfigs(
  seasonYear = currentSeasonYear(),
): JfaJsonSourceConfig[] {
  const base = `${JFA_ORIGIN}${PREMIER_DIR}`;
  return [
    {
      sourceId: "jfa-premier-east",
      sourceName: "JFA プレミアリーグ EAST",
      competitionSlug: "premier-east",
      competitionName: `高円宮杯 JFA U-18 サッカープレミアリーグ ${seasonYear} EAST`,
      shortName: "EAST",
      category: "PREMIER",
      path: `${PREMIER_DIR}/east/`,
      sourceUrl: `${base}/east/standings/`,
      seasonYear,
      regionSlug: null,
      prefectureSlug: null,
    },
    {
      sourceId: "jfa-premier-west",
      sourceName: "JFA プレミアリーグ WEST",
      competitionSlug: "premier-west",
      competitionName: `高円宮杯 JFA U-18 サッカープレミアリーグ ${seasonYear} WEST`,
      shortName: "WEST",
      category: "PREMIER",
      path: `${PREMIER_DIR}/west/`,
      sourceUrl: `${base}/west/standings/`,
      seasonYear,
      regionSlug: null,
      prefectureSlug: null,
    },
  ];
}

export function buildPrinceConfigs(
  seasonYear = currentSeasonYear(),
): JfaJsonSourceConfig[] {
  const configs: JfaJsonSourceConfig[] = [];
  for (const block of PRINCE_BLOCKS) {
    for (const group of block.groups) {
      const path = group.group
        ? `/match_47fa/${block.dir}/${PRINCE_DIR}/${group.group}/`
        : `/match_47fa/${block.dir}/${PRINCE_DIR}/`;
      configs.push({
        sourceId: group.sourceId,
        sourceName: `JFA プリンスリーグ ${block.regionName} ${group.label}`,
        competitionSlug: group.competitionSlug,
        competitionName: `高円宮杯 JFA U-18 サッカープリンスリーグ ${seasonYear} ${block.regionName} ${group.label}`,
        shortName: group.label,
        category: "PRINCE",
        path,
        sourceUrl: `${JFA_ORIGIN}/match/${PRINCE_DIR}/${block.regionSlug}/`,
        seasonYear,
        regionSlug: block.regionSlug,
        prefectureSlug: null,
      });
    }
  }
  return configs;
}

export function buildJfaAdapters(seasonYear = currentSeasonYear()): JfaJsonAdapter[] {
  return [...buildPremierConfigs(seasonYear), ...buildPrinceConfigs(seasonYear)].map(
    (config) => new JfaJsonAdapter(config),
  );
}
