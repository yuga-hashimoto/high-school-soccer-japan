import type { PrefectureSourceInput } from "./types";

/**
 * 滋賀はTECRA系の専用公式サイトを持ち、HTMLの順位表・試合結果テーブルを
 * 公開している。3部はA/Bの2グループ制のため、グループ単位の
 * エンドポイントをextrasとして登録する。
 */
const SHIGA_EXTRAS: PrefectureSourceInput["extras"] = [
  {
    slug: "shiga-3",
    name: "滋賀3部",
    level: 4,
    parentSlug: "shiga",
    sortOrder: 3,
  },
  {
    slug: "shiga-3-a",
    name: "滋賀3部 Aグループ",
    level: 5,
    parentSlug: "shiga-3",
    sortOrder: 1,
  },
  {
    slug: "shiga-3-b",
    name: "滋賀3部 Bグループ",
    level: 5,
    parentSlug: "shiga-3",
    sortOrder: 2,
  },
];

/**
 * 奈良は1部・2部に加えて3部がA/Bの2グループ制。1つの結果PDFに
 * 「3部A 1節 ...」「3部B 1節 ...」の形式で全試合が並ぶため、
 * グループ単位でlineFilterして取り込む。
 */
const NARA_EXTRAS: PrefectureSourceInput["extras"] = [
  {
    slug: "nara-3",
    name: "奈良3部",
    level: 4,
    parentSlug: "nara",
    sortOrder: 3,
  },
  {
    slug: "nara-3-a",
    name: "奈良3部 Aグループ",
    level: 5,
    parentSlug: "nara-3",
    sortOrder: 1,
  },
  {
    slug: "nara-3-b",
    name: "奈良3部 Bグループ",
    level: 5,
    parentSlug: "nara-3",
    sortOrder: 2,
  },
];

/**
 * 和歌山のU-18リーグは1部〜3部の「試合結果」PDFを公開する。1部・2部は
 * 前期/後期を2行に分けた星取表で座標リーダーが対応付かないが、3部は
 * 通年1行の順位表として読めるため3部のみを登録する（和歌山は通常
 * 2部までのため、3部はextrasとして宣言する）。
 */
const WAKAYAMA_EXTRAS: PrefectureSourceInput["extras"] = [
  {
    slug: "wakayama-3",
    name: "和歌山3部",
    level: 4,
    parentSlug: "wakayama",
    sortOrder: 3,
  },
];

/** 関西ブロック。 */
export const KANSAI: PrefectureSourceInput[] = [
  {
    slug: "shiga",
    associationName: "滋賀県サッカー協会",
    url: "https://shiga-fa-u18.com/",
    format: "HTML",
    status: "ACTIVE",
    urlVerified: true,
    adapter: "prefecture-html",
    endpoints: [
      {
        competitionSlug: "shiga-1",
        standingsUrl: "https://shiga-fa-u18.com/order/1/2026",
        matchesUrl: "https://shiga-fa-u18.com/match/1/2026",
      },
      {
        competitionSlug: "shiga-2",
        standingsUrl: "https://shiga-fa-u18.com/order/2/2026",
        matchesUrl: "https://shiga-fa-u18.com/match/2/2026",
      },
      {
        competitionSlug: "shiga-3-a",
        standingsUrl:
          "https://shiga-fa-u18.com/order/3/2026/all?group_id=1001",
        matchesUrl: "https://shiga-fa-u18.com/match/3/2026/all?group_id=1001",
      },
      {
        competitionSlug: "shiga-3-b",
        standingsUrl:
          "https://shiga-fa-u18.com/order/3/2026/all?group_id=1002",
        matchesUrl: "https://shiga-fa-u18.com/match/3/2026/all?group_id=1002",
      },
    ],
    extras: SHIGA_EXTRAS,
    notes:
      "滋賀県サッカー協会が運営する専用公式サイト。1部〜3部を順位表(/order/<部>/<年>)・試合結果(/match/<部>/<年>)としてHTMLで公開。3部はA/Bの2グループ制で、group_id=1001(A)/1002(B)を指定して取得する。4部は前期A〜D・後期A〜Eの複数ブロック制で順位が前期と後期に分かれるため、本設定では1部〜3部のみを対象とする。",
  },
  {
    slug: "kyoto",
    associationName: "京都府サッカー協会",
    url: "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "kyoto-1",
        matchesUrl: "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13",
        pdfLinkPattern: "2026u18_1s",
        headers: { Referer: "https://www.kyoto-fa.or.jp/" },
      },
      {
        competitionSlug: "kyoto-2",
        matchesUrl: "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13",
        pdfLinkPattern: "2026u18_2s",
        headers: { Referer: "https://www.kyoto-fa.or.jp/" },
      },
      {
        competitionSlug: "kyoto-3-a",
        standingsUrl: "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13",
        pdfTable: true,
        pdfLinkPattern: "2026u18_3r",
        sectionIndex: 0,
        headers: { Referer: "https://www.kyoto-fa.or.jp/" },
      },
      {
        competitionSlug: "kyoto-3-b",
        standingsUrl: "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13",
        pdfTable: true,
        pdfLinkPattern: "2026u18_3r",
        sectionIndex: 1,
        headers: { Referer: "https://www.kyoto-fa.or.jp/" },
      },
    ],
    extras: [
      { slug: "kyoto-3-a", name: "京都3部A", level: 4, parentSlug: "kyoto-3", sortOrder: 1 },
      { slug: "kyoto-3-b", name: "京都3部B", level: 4, parentSlug: "kyoto-3", sortOrder: 2 },
    ],
    notes:
      "協会のU18リーグページが1〜4部の結果PDF・順位表PDFを公開。PDF配信がRefererを要求するため付与して取得する。1部・2部は結果一覧から順位を算出、3部は順位表PDF(A/B)を座標復元する。",
  },
  {
    slug: "osaka",
    associationName: "大阪府サッカー協会",
    url: "http://osaka-fa.or.jp/",
    notes:
      "大阪府サッカー協会2種委員会の『高円宮杯JFA U-18サッカーリーグ2026 OSAKA』ページは、1部〜3部の試合予定をPDF(https://osaka-fa.or.jp/2shu/wp-content/uploads/sites/6/2026/.../U18_div*.pdf)で公開するが、いずれも『試合予定』でスコアを含まない。試合結果・順位は技術委員会CGI(http://www.ofa-tec.jp/gm/gmresult.cgi?tsl=170/171/172)が返す星取表のみ。CGIはShift_JISで出力されるためUTF-8として読む汎用HTMLアダプタでは日本語が文字化けし、加えて順位表が外側の<table>に入れ子で抽出できない。CGIの印刷用PDF(ofa-tec.jp/gm/pdf/<id>.pdf)にもチーム名のテキスト層がない。順位・結果を取り込めないためNEEDS_PARSER。",
  },
  {
    slug: "hyogo",
    associationName: "兵庫県サッカー協会",
    url: "http://www.hyogo-fa.gr.jp/competition_info/13224",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "hyogo-1",
        standingsUrl: "http://www.hyogo-fa.gr.jp/competition_info/13224",
        pdfTable: true,
        pdfLinkPattern: "試合結果表",
        sectionFilter: "1部",
      },
      {
        competitionSlug: "hyogo-2",
        standingsUrl: "http://www.hyogo-fa.gr.jp/competition_info/13224",
        pdfTable: true,
        pdfLinkPattern: "試合結果表",
        sectionFilter: "2部",
      },
    ],
    notes:
      "協会の「U-18県リーグ試合結果表」PDFから、座標を使って1部・2部の順位表をセクション別に復元。",
  },
  {
    slug: "nara",
    associationName: "奈良県サッカー協会",
    url: "https://www.narafa.or.jp/pages/26",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "nara-1",
        matchesUrl: "https://www.narafa.or.jp/pages/26",
        pdfLinkPattern: "narafa",
        pdfSelection: "mostMatches",
        lineFilter: "^1部",
      },
      {
        competitionSlug: "nara-2",
        matchesUrl: "https://www.narafa.or.jp/pages/26",
        pdfLinkPattern: "narafa",
        pdfSelection: "mostMatches",
        lineFilter: "^2部",
      },
      {
        competitionSlug: "nara-3-a",
        matchesUrl: "https://www.narafa.or.jp/pages/26",
        pdfLinkPattern: "narafa",
        pdfSelection: "mostMatches",
        lineFilter: "^3部A",
      },
      {
        competitionSlug: "nara-3-b",
        matchesUrl: "https://www.narafa.or.jp/pages/26",
        pdfLinkPattern: "narafa",
        pdfSelection: "mostMatches",
        lineFilter: "^3部B",
      },
    ],
    extras: NARA_EXTRAS,
    notes:
      "協会サイト(奈良県U-18リーグ)が1部〜3部の日程・結果を1つのPDFで公開。各行が「1部 1節 9:30 奈良クラブユース 11-0 五條 会場」の形式で、部・グループ(3部A/3部B)で絞り込んで取り込む。順位は結果から算出。",
  },
  {
    slug: "wakayama",
    associationName: "和歌山県サッカー協会",
    url: "http://www.wfa.or.jp/pages/350",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "wakayama-3",
        standingsUrl: "http://www.wfa.or.jp/pages/350",
        pdfTable: true,
        pdfLinkPattern: "libs/27136",
      },
    ],
    extras: WAKAYAMA_EXTRAS,
    notes:
      "協会ページ(pages/350)が『高円宮杯JFA U-18サッカーリーグ2026和歌山』1部〜3部の試合結果PDFを公開。1部・2部は前期/後期を2行に分けた星取表で、順位表のチーム名行と数値行が座標上ずれており座標リーダーでは正しく対応付かない(取材結果も全角ハイフン『－』と○/●/△区切りで汎用の試合結果行パーサの対象外)。3部は通年1行のため座標リーダーで順位表を復元でき、3部のみACTIVEとして登録する。",
  },
];
