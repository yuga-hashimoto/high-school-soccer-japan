import type { PrefectureSourceInput } from "./types";

/** 東海ブロック。 */
export const TOKAI: PrefectureSourceInput[] = [
  {
    slug: "gifu",
    associationName: "岐阜県サッカー協会",
    url: "http://www.gifu-fa.com/",
    notes:
      "協会2種(高校･ユース)ページのG1〜G4リーグ各節結果・順位をPDFで公開(例: G1 https://www.gifu-fa.com/wp/wp-content/uploads/2026/08/26f559a253f3b61e46951a7db5801db4.pdf)。しかしG1/G2の戦績表(星取表)は見出しセルが「勝/点」「得/点」のように縦に分割されて抽出されるため、汎用PDFパーサが順位表の「勝点」ヘッダを認識できず0行。G3(C)/G4(A,B)の結果PDFも『№ チーム名 スコア 相手№ 相手名』の順で相手チーム番号がチーム名の前に来るため、試合行として解釈できない。G3(D)だけが『№ チーム名 スコア 相手名 №』の並びで18試合を取得できるが、シードされた1部/2部(G1/G2)を復元できないためNEEDS_PARSER。",
  },
  {
    slug: "shizuoka",
    associationName: "静岡県サッカー協会",
    url: "https://www.shizuoka-fa.com/game/under18/14586/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "shizuoka-a",
        standingsUrl: "https://www.shizuoka-fa.com/game/under18/14586/",
        pdfTable: true,
        pdfLinkText: "Aリーグ結果",
      },
      {
        competitionSlug: "shizuoka-b",
        standingsUrl: "https://www.shizuoka-fa.com/game/under18/14586/",
        pdfTable: true,
        pdfLinkText: "Bリーグ結果",
      },
      {
        competitionSlug: "shizuoka-c",
        standingsUrl: "https://www.shizuoka-fa.com/game/under18/14586/",
        pdfTable: true,
        pdfLinkText: "Cリーグ結果",
      },
    ],
    extras: [
      { slug: "shizuoka-a", name: "静岡Aリーグ", level: 4, parentSlug: "shizuoka", sortOrder: 1 },
      { slug: "shizuoka-b", name: "静岡Bリーグ", level: 4, parentSlug: "shizuoka", sortOrder: 2 },
      { slug: "shizuoka-c", name: "静岡Cリーグ", level: 4, parentSlug: "shizuoka", sortOrder: 3 },
    ],
    notes:
      "協会の高円宮杯U-18ページがA/B/Cリーグの結果PDFを公開。ファイル名はハッシュだがリンク文言が一定のため、リンク文言で選択して座標から順位表を復元する。",
  },
  {
    slug: "aichi",
    associationName: "愛知県サッカー協会",
    url: "https://www.aifa.jp/event/id_2690/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "aichi-higashimikawa-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "東三河地区リーグ-地区一部リーグ",
      },
      {
        competitionSlug: "aichi-higashimikawa-2",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "東三河地区リーグ-地区二部リーグ",
      },
      {
        competitionSlug: "aichi-nishimikawa-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "西三河地区1部リーグ結果",
      },
      {
        competitionSlug: "aichi-nishimikawa-2",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "西三河地区2部リーグ結果",
      },
      {
        competitionSlug: "aichi-nagoya-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "名古屋地区リーグ星取表1部",
      },
      {
        competitionSlug: "aichi-chita-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "知多地区リーグ星取表",
      },
      {
        competitionSlug: "aichi-higashioari-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "東尾張地区1部リーグ結果",
      },
      {
        competitionSlug: "aichi-higashioari-2",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "東尾張地区2部リーグ結果",
      },
      {
        competitionSlug: "aichi-nishioari-1",
        standingsUrl: "https://www.aifa.jp/event/id_2690/",
        pdfTable: true,
        pdfLinkPattern: "西尾張地区1部リーグ結果",
      },
    ],
    extras: [
      { slug: "aichi-districts", name: "愛知地区リーグ", level: 5, parentSlug: "aichi", sortOrder: 10 },
      { slug: "aichi-higashimikawa-1", name: "愛知東三河1部", level: 6, parentSlug: "aichi-districts", sortOrder: 1 },
      { slug: "aichi-higashimikawa-2", name: "愛知東三河2部", level: 6, parentSlug: "aichi-districts", sortOrder: 2 },
      { slug: "aichi-nishimikawa-1", name: "愛知西三河1部", level: 6, parentSlug: "aichi-districts", sortOrder: 3 },
      { slug: "aichi-nishimikawa-2", name: "愛知西三河2部", level: 6, parentSlug: "aichi-districts", sortOrder: 4 },
      { slug: "aichi-nagoya-1", name: "愛知名古屋1部", level: 6, parentSlug: "aichi-districts", sortOrder: 5 },
      { slug: "aichi-chita-1", name: "愛知知多1部", level: 6, parentSlug: "aichi-districts", sortOrder: 6 },
      { slug: "aichi-higashioari-1", name: "愛知東尾張1部", level: 6, parentSlug: "aichi-districts", sortOrder: 7 },
      { slug: "aichi-higashioari-2", name: "愛知東尾張2部", level: 6, parentSlug: "aichi-districts", sortOrder: 8 },
      { slug: "aichi-nishioari-1", name: "愛知西尾張1部", level: 6, parentSlug: "aichi-districts", sortOrder: 9 },
    ],
    notes:
      "協会の高円宮杯U-18ページが各地区リーグの星取表・結果PDFを公開。座標から順位表を復元する。愛知は地区リーグ制のため、地区ごとにCompetitionを分けて登録している。",
  },
  {
    slug: "mie",
    associationName: "三重県サッカー協会",
    url: "https://www.fa-mie.jp/",
    notes:
      "協会2種委員会2025ページ(https://www.fa-mie.jp/17339/)の高円宮杯JFA U-18サッカーリーグ2025について、1部/2部の星取表PDF(.../2025/12/ccc51bad..., .../2025/12/233c7eb3...)は『チーム名/勝点/得失点差/総得点/総失点』の並びでパーサが順位表10行を正しく抽出できる。ただしこれらは2025年度のリーグ戦績で、2026年度(2種委員会2026相当)のページは協会サイトに未公開。2026シーズンとして取り込むと年度が誤るためNEEDS_PARSER。",
  },
];
