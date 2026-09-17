import type { PrefectureSourceInput } from "./types";

/** 北海道・東北ブロック。 */
export const HOKKAIDO_TOHOKU: PrefectureSourceInput[] = [
  {
    slug: "hokkaido",
    associationName: "北海道サッカー協会",
    url: "https://www.hfa-dream.or.jp/",
    notes:
      "第2種(U-18)大会情報(https://www.hfa-dream.or.jp/tournament/2syu/)で高円宮杯JFA U-18サッカーリーグ2026北海道FAリーグおよびブロックリーグの日程表・星取表をPDF公開(例: FAリーグ星取表 /wp-content/uploads/2026/03/202604140204.pdf, 道央 /202604160407.pdf, 道北 /202604160308.pdf, 道南 /202604160109.pdf)。しかし星取表の順位欄は見出しが「勝」+「点」のように分割されてテキスト出力され、PDF順位表リーダーが必須とする『勝点』セルが存在しないため順位表を復元できない。星取表も1行にチーム名とスコアが同居せず、日程表PDFにはスコアが無いため結果行としても読めない。よってNEEDS_PARSER。",
  },
  {
    slug: "aomori",
    associationName: "青森県サッカー協会",
    url: "https://www.aomori-fa.jp/",
    notes:
      "2種(高校)ページ(https://www.aomori-fa.jp/category/committee/all-committee/highschool/)の大会記事で高円宮杯JFA U-18サッカーリーグ青森2026の星取表(1部・2部)と大会日程をPDF公開(星取表 /wp/wp-content/uploads/2026/08/星取表0907.pdf、3部後期 星取表_３部後期0907-1.pdf)。星取表はチーム名が縦積みで各結果行の行頭に無く、順位欄の見出しも1文字ずつに分割されるため順位表リーダーで復元できない。日程PDF(2026県リーグ大会日程案0907.pdf 等)には「弘前実業高等学校 0-2 青森山田高等学校３ｒｄ」形式の結果行があり結果自体は読めるが、1部/2部の区分は別行のカテゴリー列にのみ存在し結果行と同一行に無いため lineFilter で部を分離できない。よってNEEDS_PARSER。",
  },
  {
    slug: "iwate",
    associationName: "岩手県サッカー協会",
    url: "https://www.fa-iwate.com/",
    notes:
      "協会2種ページ(https://www.fa-iwate.com/tournament-event-workshop/second/)から公式データサイトgoalnoteにリンク。順位は https://www.goalnote.net/detail-standings.php?tid=18702 (D1)等にHTML表で掲載されるが、ヘッダが「勝点/試合数/勝利/引分/敗戦/得点/失点/得失差」で順位・チーム列の見出しが無く、汎用HTMLアダプタの列判定(順位・チーム必須)に適合しない。協会ホストのリーグPDFは試合日程のみ(https://www.fa-iwate.com/documents/26/26_ken_2_i-league_sch.pdf)でスコアが無く、結果PDFは公開されていない。よってNEEDS_PARSER。",
  },
  {
    slug: "miyagi",
    associationName: "宮城県サッカー協会",
    url: "https://www.miyagi-fa.com/",
    notes:
      "宮城県トラック協会杯宮城県リーグU-18 2026(https://www.miyagi-fa.com/news/2nd/2nd-results/2026/03-31-47806/)でM1〜M4の順位表(勝敗表)PDFを公開(例: M1勝敗表 https://www.miyagi-fa.com/cms/wp-content/uploads/2026/03/7b872033acd57bf008d7ea2a5b823a80-19.pdf)。ただし協会の robots.txt が「Disallow: /cms/」で、PDFはすべて /cms/ 配下のため取得できない(/wp-content/ 配下には404)。よってNEEDS_PARSER。",
  },
  {
    slug: "akita",
    associationName: "秋田県サッカー協会",
    url: "https://fa-akita.net/16943/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "akita-1",
        matchesUrl: "https://fa-akita.net/16943/",
        pdfSelection: "mostMatches",
        lineFilter: "^A1",
      },
      {
        competitionSlug: "akita-2",
        matchesUrl: "https://fa-akita.net/16943/",
        pdfSelection: "mostMatches",
        lineFilter: "^A2",
      },
    ],
    notes:
      "2種大会情報(https://fa-akita.net/16943/)の「2026_日程1部・2部･3部(0913更新)」PDF(例: /wp/wp-content/uploads/2026/09/aeac3622ff02fe672c0859a9d94d2c0c-2.pdf)には「A1 10:30 明桜 10 - 0 大曲工」形式の結果が1試合1行で並ぶ。行頭のカテゴリー(A1=1部, A2=2部)で部を分離し、順位は結果から算出する。ファイル名がハッシュのため pdfSelection: 「mostMatches」で最新の結果PDFを自動選択する。",
  },
  {
    slug: "yamagata",
    associationName: "山形県サッカー協会",
    url: "https://www.yfa.jp/",
    notes:
      "協会2種ページの大会ページ(https://www.yfa.jp/archives/4320)に大会要項PDF(https://www.yfa.jp/2023/wp-content/uploads/2026/09/Yリーグ2026_要領.pdf)と、各部(1部/2部A前期/2部B前期/3部A〜D)のgoalnoteリンクを掲載。順位は https://www.goalnote.net/detail-standings.php?tid=18649 (1部)等にHTML表で掲載されるが、ヘッダが「勝点/試合数/勝利/引分/敗戦/得点/失点/得失差」で順位・チーム列の見出しが無く、汎用HTMLアダプタの列判定に適合しない。goalnoteはrobots.txtがクロールを拒否。協会ホストの結果PDFは無いためNEEDS_PARSER。",
  },
  {
    slug: "fukushima",
    associationName: "福島県サッカー協会",
    url: "https://fukushima-fa.com/match/2026/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "fukushima-1",
        standingsUrl: "https://fukushima-fa.com/match/2026/",
        pdfTable: true,
        pdfLinkPattern: "F1順位表",
      },
      {
        competitionSlug: "fukushima-2",
        standingsUrl: "https://fukushima-fa.com/match/2026/",
        pdfTable: true,
        pdfLinkPattern: "F2順位表",
      },
    ],
    notes:
      "協会の試合情報ページがF1〜F3リーグの順位表・星取表PDFを公開。座標から順位表を復元する(F1・F2を取得)。",
  },
];
