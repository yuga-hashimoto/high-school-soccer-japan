import type { CompetitionCategory } from "@/domain/enums";

export interface RegionSeed {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface PrefectureSeed {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  sortOrder: number;
}

/**
 * JFA's nine regional blocks. Prince leagues are organised along these lines,
 * so the region list is the backbone of the "地域" tab.
 */
export const REGIONS: RegionSeed[] = [
  { id: "region-hokkaido", name: "北海道", slug: "hokkaido", sortOrder: 1 },
  { id: "region-tohoku", name: "東北", slug: "tohoku", sortOrder: 2 },
  { id: "region-kanto", name: "関東", slug: "kanto", sortOrder: 3 },
  { id: "region-hokushinetsu", name: "北信越", slug: "hokushinetsu", sortOrder: 4 },
  { id: "region-tokai", name: "東海", slug: "tokai", sortOrder: 5 },
  { id: "region-kansai", name: "関西", slug: "kansai", sortOrder: 6 },
  { id: "region-chugoku", name: "中国", slug: "chugoku", sortOrder: 7 },
  { id: "region-shikoku", name: "四国", slug: "shikoku", sortOrder: 8 },
  { id: "region-kyushu", name: "九州", slug: "kyushu", sortOrder: 9 },
];

const rawPrefectures: Array<[string, string]> = [
  ["北海道", "region-hokkaido"],

  ["青森", "region-tohoku"],
  ["岩手", "region-tohoku"],
  ["宮城", "region-tohoku"],
  ["秋田", "region-tohoku"],
  ["山形", "region-tohoku"],
  ["福島", "region-tohoku"],

  ["茨城", "region-kanto"],
  ["栃木", "region-kanto"],
  ["群馬", "region-kanto"],
  ["埼玉", "region-kanto"],
  ["千葉", "region-kanto"],
  ["東京", "region-kanto"],
  ["神奈川", "region-kanto"],
  ["山梨", "region-kanto"],

  ["新潟", "region-hokushinetsu"],
  ["富山", "region-hokushinetsu"],
  ["石川", "region-hokushinetsu"],
  ["福井", "region-hokushinetsu"],
  ["長野", "region-hokushinetsu"],

  ["岐阜", "region-tokai"],
  ["静岡", "region-tokai"],
  ["愛知", "region-tokai"],
  ["三重", "region-tokai"],

  ["滋賀", "region-kansai"],
  ["京都", "region-kansai"],
  ["大阪", "region-kansai"],
  ["兵庫", "region-kansai"],
  ["奈良", "region-kansai"],
  ["和歌山", "region-kansai"],

  ["鳥取", "region-chugoku"],
  ["島根", "region-chugoku"],
  ["岡山", "region-chugoku"],
  ["広島", "region-chugoku"],
  ["山口", "region-chugoku"],

  ["徳島", "region-shikoku"],
  ["香川", "region-shikoku"],
  ["愛媛", "region-shikoku"],
  ["高知", "region-shikoku"],

  ["福岡", "region-kyushu"],
  ["佐賀", "region-kyushu"],
  ["長崎", "region-kyushu"],
  ["熊本", "region-kyushu"],
  ["大分", "region-kyushu"],
  ["宮崎", "region-kyushu"],
  ["鹿児島", "region-kyushu"],
  ["沖縄", "region-kyushu"],
];

export const PREFECTURE_SLUGS: Record<string, string> = {
  北海道: "hokkaido",
  青森: "aomori",
  岩手: "iwate",
  宮城: "miyagi",
  秋田: "akita",
  山形: "yamagata",
  福島: "fukushima",
  茨城: "ibaraki",
  栃木: "tochigi",
  群馬: "gunma",
  埼玉: "saitama",
  千葉: "chiba",
  東京: "tokyo",
  神奈川: "kanagawa",
  山梨: "yamanashi",
  新潟: "niigata",
  富山: "toyama",
  石川: "ishikawa",
  福井: "fukui",
  長野: "nagano",
  岐阜: "gifu",
  静岡: "shizuoka",
  愛知: "aichi",
  三重: "mie",
  滋賀: "shiga",
  京都: "kyoto",
  大阪: "osaka",
  兵庫: "hyogo",
  奈良: "nara",
  和歌山: "wakayama",
  鳥取: "tottori",
  島根: "shimane",
  岡山: "okayama",
  広島: "hiroshima",
  山口: "yamaguchi",
  徳島: "tokushima",
  香川: "kagawa",
  愛媛: "ehime",
  高知: "kochi",
  福岡: "fukuoka",
  佐賀: "saga",
  長崎: "nagasaki",
  熊本: "kumamoto",
  大分: "oita",
  宮崎: "miyazaki",
  鹿児島: "kagoshima",
  沖縄: "okinawa",
};

export const PREFECTURES: PrefectureSeed[] = rawPrefectures.map(
  ([name, regionId], index) => ({
    id: `pref-${PREFECTURE_SLUGS[name]}`,
    regionId,
    name,
    slug: PREFECTURE_SLUGS[name],
    sortOrder: index + 1,
  }),
);

export const PREFECTURE_BY_SLUG = new Map(
  PREFECTURES.map((p) => [p.slug, p]),
);

export interface CompetitionSeed {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  category: CompetitionCategory;
  parentId: string | null;
  regionId: string | null;
  prefectureId: string | null;
  level: number | null;
  sortOrder: number;
  sourceId: string | null;
}

/** Prefectures that field four or more divisions in the source system. */
export const DEEP_PREFECTURES = new Set([
  "fukuoka",
  "tokyo",
  "kanagawa",
  "osaka",
  "aichi",
  "hyogo",
  "saitama",
  "chiba",
  "kyoto",
  "shizuoka",
  "hiroshima",
  "niigata",
  "miyagi",
]);

export function buildCompetitions(): CompetitionSeed[] {
  const out: CompetitionSeed[] = [];
  let sort = 0;

  out.push({
    id: "comp-premier",
    name: "高円宮杯 JFA U-18 サッカープレミアリーグ",
    shortName: "プレミアリーグ",
    slug: "premier",
    category: "PREMIER",
    parentId: null,
    regionId: null,
    prefectureId: null,
    level: 1,
    sortOrder: ++sort,
    sourceId: "jfa-premier",
  });
  out.push({
    id: "comp-premier-east",
    name: "プレミアリーグ EAST",
    shortName: "EAST",
    slug: "premier-east",
    category: "PREMIER",
    parentId: "comp-premier",
    regionId: null,
    prefectureId: null,
    level: 2,
    sortOrder: 1,
    sourceId: "jfa-premier",
  });
  out.push({
    id: "comp-premier-west",
    name: "プレミアリーグ WEST",
    shortName: "WEST",
    slug: "premier-west",
    category: "PREMIER",
    parentId: "comp-premier",
    regionId: null,
    prefectureId: null,
    level: 2,
    sortOrder: 2,
    sourceId: "jfa-premier",
  });

  for (const region of REGIONS) {
    const parentId = `comp-prince-${region.slug}`;
    out.push({
      id: parentId,
      name: `高円宮杯 JFA U-18 サッカープリンスリーグ ${region.name}`,
      shortName: `プリンス${region.name}`,
      slug: `prince-${region.slug}`,
      category: "PRINCE",
      parentId: null,
      regionId: region.id,
      prefectureId: null,
      level: 3,
      sortOrder: 100 + region.sortOrder,
      sourceId: `jfa-prince-${region.slug}`,
    });

    // 四国 runs a single division; every other block splits into 1部/2部.
    const divisions = region.slug === "shikoku" ? 1 : 2;
    for (let division = 1; division <= divisions; division += 1) {
      out.push({
        id: `${parentId}-${division}`,
        name: `${region.name}${division}部`,
        shortName: `${division}部`,
        slug: `prince-${region.slug}-${division}`,
        category: "PRINCE",
        parentId,
        regionId: region.id,
        prefectureId: null,
        level: 3 + division,
        sortOrder: division,
        sourceId: `jfa-prince-${region.slug}`,
      });
    }
  }

  for (const pref of PREFECTURES) {
    const parentId = `comp-${pref.slug}`;
    out.push({
      id: parentId,
      name: `${pref.name}U-18リーグ`,
      shortName: `${pref.name}U-18`,
      slug: pref.slug,
      category: "PREFECTURE",
      parentId: null,
      regionId: pref.regionId,
      prefectureId: pref.id,
      level: 4,
      sortOrder: 500 + pref.sortOrder,
      sourceId: `pref-${pref.slug}`,
    });

    const divisions = DEEP_PREFECTURES.has(pref.slug) ? 3 : 2;
    for (let division = 1; division <= divisions; division += 1) {
      out.push({
        id: `${parentId}-${division}`,
        name: `${pref.name}${division}部`,
        shortName: `${division}部`,
        slug: `${pref.slug}-${division}`,
        category: "PREFECTURE",
        parentId,
        regionId: pref.regionId,
        prefectureId: pref.id,
        level: 4,
        sortOrder: division,
        sourceId: `pref-${pref.slug}`,
      });
    }
  }

  // Fukuoka is the reference implementation for deep, irregular nesting:
  // a 3部 split into blocks, plus district leagues below that.
  out.push({
    id: "comp-fukuoka-4",
    name: "福岡4部（地区リーグ）",
    shortName: "4部",
    slug: "fukuoka-4",
    category: "DISTRICT",
    parentId: "comp-fukuoka",
    regionId: "region-kyushu",
    prefectureId: "pref-fukuoka",
    level: 5,
    sortOrder: 4,
    sourceId: "pref-fukuoka",
  });

  const fukuokaDistricts: Array<[string, string]> = [
    ["fukuoka-chuo", "福岡中央地区"],
    ["fukuoka-kita", "福岡北地区"],
    ["kitakyushu", "北九州地区"],
    ["chikugo", "筑後地区"],
  ];
  fukuokaDistricts.forEach(([slug, name], index) => {
    out.push({
      id: `comp-${slug}`,
      name: `${name}U-18リーグ`,
      shortName: name,
      slug,
      category: "DISTRICT",
      parentId: "comp-fukuoka-4",
      regionId: "region-kyushu",
      prefectureId: "pref-fukuoka",
      level: 6,
      sortOrder: index + 1,
      sourceId: "pref-fukuoka",
    });
  });

  // A group-stage split underneath a division, to prove arbitrary depth.
  const groups: Array<[string, string]> = [
    ["fukuoka-2-a", "A"],
    ["fukuoka-2-b", "B"],
  ];
  groups.forEach(([slug, name], index) => {
    out.push({
      id: `comp-${slug}`,
      name: `福岡2部 ${name}グループ`,
      shortName: `2部${name}`,
      slug,
      category: "PREFECTURE",
      parentId: "comp-fukuoka-2",
      regionId: "region-kyushu",
      prefectureId: "pref-fukuoka",
      level: 5,
      sortOrder: index + 1,
      sourceId: "pref-fukuoka",
    });
  });

  return out;
}
