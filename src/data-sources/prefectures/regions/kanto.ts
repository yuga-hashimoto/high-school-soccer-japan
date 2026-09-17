import type { PrefectureSourceInput } from "./types";

/** 関東ブロック。 */
export const KANTO: PrefectureSourceInput[] = [
  {
    slug: "ibaraki",
    associationName: "茨城県サッカー協会",
    url: "https://www.ibaraki-fa.jp/info/c2-20260213/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "ibaraki-1",
        standingsUrl: "https://www.ibaraki-fa.jp/info/c2-20260213/",
        pdfTable: true,
        pdfLinkPattern: "_1_league",
      },
      {
        competitionSlug: "ibaraki-2",
        standingsUrl: "https://www.ibaraki-fa.jp/info/c2-20260213/",
        pdfTable: true,
        pdfLinkPattern: "_2_league",
      },
    ],
    notes:
      "協会のIFAリーグページが1〜4部の「リーグ戦表」PDFを公開。座標から順位表を復元する(1部・2部を取得)。3部AB・4部各地区は別PDF。",
  },
  {
    slug: "tochigi",
    associationName: "栃木県サッカー協会",
    url: "http://www.tfa.or.jp/",
    notes:
      "栃木県サッカー協会公式サイト(http://www.tfa.or.jp/wptfa/)の第2種ページ(?cat=12)は「試合結果速報」を LSIN (http://api.lsin.jp/?c=3&l=35) に委ねている。LSINはJavaScriptで大会一覧・結果を描画するSPAで、取得したHTMLに<table>も結果PDFも含まれない（apires/js で動的取得）。協会サイト内にもU-18リーグの結果PDFは見つからないため未対応。",
  },
  {
    slug: "gunma",
    associationName: "群馬県サッカー協会",
    url: "https://gunma-fa.com/post-694/",
    format: "HTML",
    status: "ACTIVE",
    urlVerified: true,
    adapter: "prefecture-html",
    endpoints: [
      {
        competitionSlug: "gunma-1",
        standingsUrl: "https://management.gunma-fa.com/api/table/173",
        matchesUrl: "https://management.gunma-fa.com/api/match/173",
      },
    ],
    notes:
      "群馬県サッカー協会の2026年度高円宮杯JFA U-18サッカーリーグ群馬ページ。大会データは management.gunma-fa.com の試合結果(/api/table/173)・組み合わせ(/api/match/173)でHTMLテーブルとして公開。順位表ヘッダは「順位/チーム名/勝点/試合数/勝数/引分数/敗数/得点/失点/得失点差」。1つのページに1部〜3部A〜Fの全テーブルが並ぶため、汎用パーサが取得できる先頭の順位表（1部）のみ登録。",
  },
  {
    slug: "saitama",
    associationName: "埼玉県サッカー協会",
    url: "https://www.sfa2.jp/2449/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "saitama-1",
        standingsUrl: "https://www.sfa2.jp/2449/",
        pdfTable: true,
        pdfLinkPattern: "S1-1\\.pdf$",
      },
      {
        competitionSlug: "saitama-2",
        standingsUrl: "https://www.sfa2.jp/2449/",
        pdfTable: true,
        pdfLinkPattern: "S2\\.pdf$",
      },
      {
        competitionSlug: "saitama-3",
        standingsUrl: "https://www.sfa2.jp/2449/",
        pdfTable: true,
        pdfLinkPattern: "S3\\.pdf$",
      },
    ],
    notes:
      "協会のSFAリーグページ(2026)が1〜3部の順位表PDF(914S1-1.pdf 等)を公開。座標から順位表を復元する。",
  },
  {
    slug: "chiba",
    associationName: "千葉県サッカー協会",
    url: "https://chiba-fa.gr.jp/",
    notes:
      "千葉県サッカー協会のU-18リーグページ(https://chiba-fa.gr.jp/08category2/)は1〜5部の試合結果・順位を goalnote.net (1部 tid=18441, 2部 18442, 3部 18580, 4部 18617/19320, 5部 18685/19321) で公開。goalnote.net は robots.txt で全クロール禁止。協会サイト上のPDFは実施要項 u18league2026-doc.pdf のみで、順位表・星取表・試合結果のPDFは公開されていないため未対応。",
  },
  {
    slug: "tokyo",
    associationName: "東京都サッカー協会",
    url: "https://www.tleague-u18.com/",
    format: "HTML",
    status: "ACTIVE",
    urlVerified: true,
    adapter: "prefecture-html",
    endpoints: [
      {
        competitionSlug: "tokyo-1",
        standingsUrl: "https://www.tleague-u18.com/rank.php?dt=1&dy=2026",
        matchesUrl: "https://www.tleague-u18.com/schedule.php?dt=1&dy=2026",
      },
      {
        competitionSlug: "tokyo-2",
        standingsUrl: "https://www.tleague-u18.com/rank.php?dt=2&dy=2026",
        matchesUrl: "https://www.tleague-u18.com/schedule.php?dt=2&dy=2026",
      },
      {
        competitionSlug: "tokyo-3",
        standingsUrl: "https://www.tleague-u18.com/rank.php?dt=3&dy=2026",
        matchesUrl: "https://www.tleague-u18.com/schedule.php?dt=3&dy=2026",
      },
    ],
    notes:
      "東京都サッカー協会が運営する高円宮杯JFA U-18サッカーリーグ東京の専用公式サイト（Tリーグ）。順位表は /rank.php?dt=<部>&dy=2026（ヘッダ:チーム名/勝点/試合数/勝/敗/引/得点/失点/得失点/順位）、試合日程・結果は /schedule.php?dt=<部>&dy=2026（ヘッダ:節/日時/ホームチーム/スコア/アウェイチーム/会場）のHTMLテーブル。2026年はT1〜T3を東京1部〜3部として登録。",
  },
  {
    slug: "kanagawa",
    associationName: "神奈川県サッカー協会",
    url: "http://www.kanagawa-fa.gr.jp/",
    notes:
      "神奈川県サッカー協会のU-18リーグページ(https://kanagawa-fa.gr.jp/u18_league/)。順位一覧(https://www.kanagawa-fa.gr.jp/cms/u18-league/2026-2/)は AnWP Football Leagues プラグインがJavaScriptでdivグリッド描画し、静的HTMLに順位表の<table>が無い。各K1〜K6ページ(例 /cms/u18-league/2026/div1/)には星取表の<table>が1つあるが、チーム名のヘッダ行に「順位/勝点」等の見出しが無く <thead> として認識されないため行列パーサが適用できず、PDFも公開されていない。よって未対応。",
  },
  {
    slug: "yamanashi",
    associationName: "山梨県サッカー協会",
    url: "https://www.yamanashi-football.com/pages/75/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "yamanashi-1",
        standingsUrl: "https://www.yamanashi-football.com/pages/75/",
        pdfTable: true,
        pdfLinkPattern: "libs/18554/",
      },
      {
        competitionSlug: "yamanashi-2",
        standingsUrl: "https://www.yamanashi-football.com/pages/75/",
        pdfTable: true,
        pdfLinkPattern: "libs/18552/",
      },
      {
        competitionSlug: "yamanashi-3",
        standingsUrl: "https://www.yamanashi-football.com/pages/75/",
        pdfTable: true,
        pdfLinkPattern: "libs/18555/",
      },
      {
        competitionSlug: "yamanashi-4",
        standingsUrl: "https://www.yamanashi-football.com/pages/75/",
        pdfTable: true,
        pdfLinkPattern: "libs/18580/",
      },
    ],
    extras: [
      { slug: "yamanashi-3", name: "山梨3部", level: 4, parentSlug: "yamanashi", sortOrder: 3 },
      { slug: "yamanashi-4", name: "山梨4部", level: 4, parentSlug: "yamanashi", sortOrder: 4 },
    ],
    notes:
      "高円宮杯JFA U-18サッカーリーグ2026山梨ページ(https://www.yamanashi-football.com/pages/75/)の「結 果」星取表PDFから座標を使って1〜4部の順位表を復元（5部はA/Bの2グループに分かれるため未登録）。PDFは勝点/得点/失点/得失点差/順位の列を持つ。ファイル名はタイムスタンプで更新ごとに変わるため、PDFを保持する libs レコードIDで選択している（1部=libs/18554、2部=libs/18552、3部=libs/18555、4部=libs/18580）。レコードIDごと作り直された場合は要メンテナンス。",
  },
];
