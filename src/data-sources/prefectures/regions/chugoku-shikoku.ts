import type { PrefectureSourceInput } from "./types";

/**
 * 中国・四国ブロック。
 *
 * 2026年度の高円宮杯 JFA U-18 都道府県リーグは、鳥取・香川が GoalNote クラウド、
 * 島根・広島が SportsOnline で結果を公開しており、協会ホストの順位表 HTML/PDF は
 * 確認できない。山口は協会サイトの「日程・結果」PDF から座標で順位表を復元できる
 * ため ACTIVE。岡山・徳島・愛媛・高知は PDF はあるが行・列の形式が汎用パーサの
 * 対象外のため NEEDS_PARSER とし、判明した公式ページと理由を notes に残す。
 */
export const CHUGOKU_SHIKOKU: PrefectureSourceInput[] = [
  {
    slug: "tottori",
    associationName: "鳥取県サッカー協会",
    url: "http://www.fa-tottori.com/",
    notes:
      "2026年度は「高円宮杯 JFA U-18サッカーリーグ2026鳥取わかとりリーグ」として協会公式サイトのリーグページ(https://www.fa-tottori.com/?p=24838)で告知されるが、1部〜3部の日程・結果はすべて外部の GoalNote クラウド(1部前期 https://www.goalnote.net/detail-schedule.php?tid=18541、後期 tid=19293 ほか)に掲載される。協会ホストの PDF は要項(わかとりリーグ2026要項.pdf)のみで結果資料はなく、GoalNote は robots.txt でクロール不可のため NEEDS_PARSER。",
  },
  {
    slug: "shimane",
    associationName: "島根県サッカー協会",
    url: "https://www.fa-shimane.or.jp/kinds/category2",
    notes:
      "協会2種ページ(https://www.fa-shimane.or.jp/kinds/category2)は「プリンスリーグ・島根県ユースリーグの日程および結果…はスポーツオンラインをご確認ください」と案内するのみで、2026年度の順位表・結果ページは協会サイトに存在しない(最新のお知らせは2021年度まで)。結果は SportsOnline (http://www.sportsonline.jp/reportv2/PublisherFull/HOME.aspx) の動的システムで、2026年度島根U-18の大会URL・順位表HTMLも特定できないため NEEDS_PARSER。",
  },
  {
    slug: "okayama",
    associationName: "岡山県サッカー協会",
    url: "https://okayama-fa.or.jp/2022/2-2",
    notes:
      "協会2種ページ(https://okayama-fa.or.jp/2022/2-2)の「高円宮杯 JFA U-18 サッカーリーグ OKAYAMA 2026」は PDF(https://okayama-fa.or.jp/2022/wp-content/uploads/2026/09/2026_U18L.pdf)のみ。中身は県1部・2部の対戦表で、1行に左右2試合が連結してテキスト抽出されるため行パーサでは対戦を分割できず、PDF 内に「勝点」列を持つ順位表も存在しない(pdfTable で0件を実測)。チャレンジリーグの 2_2026_CL1_1st.pdf は1試合1行で読めるが県1部・2部とは別リーグのため流用しない。NEEDS_PARSER。",
  },
  {
    slug: "hiroshima",
    associationName: "広島県サッカー協会",
    url: "https://www.hifa.jp/competition/category/cat2/",
    notes:
      "協会 2種カテゴリ(https://www.hifa.jp/competition/category/cat2/)の高円宮杯 U-18 サッカーリーグ広島は2025年度ページ(https://www.hifa.jp/competition/2025/06/12/高円宮杯-jfa-u-18サッカーリーグ2025-広島/)までで、2026年度ページは未公開。試合結果は同ページから SportsOnline (http://www.sportsonline.jp/reportv2/PublisherFull/Rally.aspx?parentid=ZP%5cQ) に委ねられており、協会ホストの順位表 PDF/HTML は確認できないため NEEDS_PARSER。",
  },
  {
    slug: "yamaguchi",
    associationName: "山口県サッカー協会",
    url: "https://yamaguchi-fa.com/archives/16620",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "yamaguchi-1",
        standingsUrl: "https://yamaguchi-fa.com/archives/16620",
        pdfTable: true,
        pdfLinkPattern: "y.l2026_1bu_keka",
      },
      {
        competitionSlug: "yamaguchi-2",
        standingsUrl: "https://yamaguchi-fa.com/archives/16620",
        pdfTable: true,
        pdfLinkPattern: "y.l2026_2bu_keka",
      },
    ],
    notes:
      "「高円宮杯 JFA U-18 サッカーリーグ2026 山口県ユースリーグ」(https://yamaguchi-fa.com/archives/16620)が1部・2部の「日程・結果」PDF(y.l2026_1bu_keka-1.pdf / y.l2026_2bu_keka.pdf)を公開。星取表の右側に座標で順位表を読み取り、勝点・順位・得失点差を取得する。",
  },
  {
    slug: "tokushima",
    associationName: "徳島県サッカー協会",
    url: "https://tokushima-fa.jp/post-414/",
    notes:
      "協会のTリーグページが結果PDF(t2026*.pdf)を公開しているが、行が「ホーム 得点-得点 (前半,後半) アウェイ」形式で、括弧内の内訳がチーム名として誤認されるため未対応。形式が確定でき次第対応する。",
  },
  {
    slug: "kagawa",
    associationName: "香川県サッカー協会",
    url: "http://www.kagawa-fa.jp/",
    notes:
      "協会2種リーグページ(https://www.kagawa-fa.jp/2nd/2nd_league.html)の2026年度は1部・2部・3部とも GoalNote クラウドへのリンクのみ(1部 https://www.goalnote.net/detail.php?tid=18633、2部 tid=18634、3部 tid=18635)で、協会ホストの順位表 PDF/HTML は提供されていない。GoalNote は robots.txt でクロール不可のため NEEDS_PARSER。",
  },
  {
    slug: "ehime",
    associationName: "愛媛県サッカー協会",
    url: "https://efa.jp/meeting/44502.html",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "ehime-2-a",
        standingsUrl: "https://efa.jp/meeting/44502.html",
        pdfTable: true,
        pdfLinkPattern: "E2-A_hoshi",
      },
      {
        competitionSlug: "ehime-2-b",
        standingsUrl: "https://efa.jp/meeting/44502.html",
        pdfTable: true,
        pdfLinkPattern: "E2B_hoshi",
      },
    ],
    extras: [
      { slug: "ehime-2-a", name: "愛媛2部A", level: 4, parentSlug: "ehime-2", sortOrder: 1 },
      { slug: "ehime-2-b", name: "愛媛2部B", level: 4, parentSlug: "ehime-2", sortOrder: 2 },
    ],
    notes:
      "協会ページが1部/2部A/2部B/3部の星取表PDFを公開。座標から順位表を復元する(2部A/Bを取得)。1部はPDFレイアウトが異なるため未取得。",
  },
  {
    slug: "kochi",
    associationName: "高知県サッカー協会",
    url: "https://www.kochi-fa.com/class02/class02sch/entry-305.html",
    notes:
      "協会2種ページ(https://www.kochi-fa.com/class02/class02sch/entry-305.html)の2026年度は1部・2部・3部を PDF で公開しているが、配布が media-download URL(例: https://www.kochi-fa.com/media-download/6383/8b55d66cc74933cb/)で、拡張子が .pdf でないため PDF アダプタの URL 解決では発見できない。直接 URL を渡して取得しても、1部日程表 PDF は星取行列、1部・2部の星取表 PDF は列が崩れて順位表を復元できない(実測)。NEEDS_PARSER。",
  },
];
