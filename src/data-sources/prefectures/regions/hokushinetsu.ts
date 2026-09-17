import type { PrefectureSourceInput } from "./types";

/** 北信越ブロック。 */
export const HOKUSHINETSU: PrefectureSourceInput[] = [
  {
    slug: "niigata",
    associationName: "新潟県サッカー協会",
    url: "https://www.niigata-fa.or.jp/news/public/detail?id=743",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "niigata-1",
        standingsUrl: "https://www.niigata-fa.or.jp/news/public/detail?id=743",
        pdfTable: true,
        pdfLinkPattern: "2026_result_U18_N1_",
      },
    ],
    notes:
      "協会の星取表PDF(2026_result_U18_N1_*.pdf)から座標を使って1部の順位表を復元。勝点・得失点差をPDFの記載どおりに取得する。",
  },
  {
    slug: "toyama",
    associationName: "富山県サッカー協会",
    url: "http://www.toyfa.jp",
    notes:
      "協会の高円宮杯JFA U-18サッカーリーグ2026富山ページ(https://toyfa.jp/?tid=104362)は、日程・結果を外部システム「大会GO!」(https://www.taikai-go.com/tournaments/groups/7)に委ねている。大会GO!はJavaScript描画のSPAで、取得したHTMLには順位表・試合結果の<table>が含まれず、協会サイトにも代替のPDFは公開されていないためNEEDS_PARSER。",
  },
  {
    slug: "ishikawa",
    associationName: "石川県サッカー協会",
    url: "http://www.ishikawa-fa.or.jp/",
    notes:
      "石川県高体連サッカー専門部サイトの高円宮杯U-18リーグ2026ページ(http://soccer-u18.ishikawa.jp/u-18.html)は、1部/2部/3部それぞれの『日程』PDF(u18/2026/2026_1st.pdf, 2026_2nd.pdf, 2026_3rd.pdf)のみを公開している。PDFの中身は対戦カード・会場・時刻だけでスコアや順位表を含まず、ページ上の『結果』はリンクになっておらず未公開。順位・結果を読めるPDF/HTMLが存在しないためNEEDS_PARSER。",
  },
  {
    slug: "fukui",
    associationName: "福井県サッカー協会",
    url: "https://www.fukui-fa.com/league-info/%e9%ab%98%e5%86%86%e5%ae%ae%e6%9d%afjfa%e3%80%80u-18%e3%82%b5%e3%83%83%e3%82%ab%e3%83%bc%e3%83%aa%e3%83%bc%e3%82%b02026%e7%a6%8f%e4%ba%95/",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "fukui-1",
        standingsUrl:
          "https://www.fukui-fa.com/main/wp-content/uploads/2026/09/e153359b4cf6e9ccd49f9b0ec0dcfa25.pdf",
        pdfTable: true,
      },
      {
        competitionSlug: "fukui-2",
        standingsUrl:
          "https://www.fukui-fa.com/main/wp-content/uploads/2026/09/75c95f920a4f26a94202e051b1056577.pdf",
        pdfTable: true,
      },
      {
        competitionSlug: "fukui-3",
        standingsUrl:
          "https://www.fukui-fa.com/main/wp-content/uploads/2026/09/4e2582c849522df15a6cebeff5dd71be.pdf",
        pdfTable: true,
      },
    ],
    extras: [
      {
        slug: "fukui-3",
        name: "福井3部",
        level: 4,
        parentSlug: "fukui",
        sortOrder: 3,
      },
    ],
    notes:
      "協会ページ(高円宮杯JFA U-18サッカーリーグ2026福井)はF1〜F4リーグの順位表・星取表をPDFで公開。PDFのファイル名がハッシュ化されておりpdfLinkPatternで自動選択できないため、各リーグのPDFを直接指定する。F2・F3の星取表は座標から順位表(チーム名/勝点/得点/失点/得失差/順位)を正しく復元でき、fukui-2とfukui-3で各8行を取得している。F1の星取表は一部チーム名が1文字ずつ別テキストとして抽出されるため8行を復元できず0行となる(要パーサ改善)。F4リーグのPDFは構造が壊れておりテキスト抽出自体が失敗する。更新のたびにURLが変わるため、更新時はURLの差し替えが必要。",
  },
  {
    slug: "nagano",
    associationName: "長野県サッカー協会",
    url: "https://www.nagano-fa.or.jp/cat_2",
    format: "PDF",
    status: "ACTIVE",
    adapter: "prefecture-pdf",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "nagano-1",
        matchesUrl: "https://www.nagano-fa.or.jp/cat_2",
        pdfLinkPattern: "2026_U18_1-",
      },
      {
        competitionSlug: "nagano-2",
        matchesUrl: "https://www.nagano-fa.or.jp/cat_2",
        pdfLinkPattern: "2026_U18_2A-",
      },
    ],
    notes:
      "協会2種ページ(https://www.nagano-fa.or.jp/cat_2)が1部/2部A/2部B/3部/4部の「日程・試合結果」をPDFで公開。埋め込みテキスト層から試合結果を読み取り、順位は結果から算出する。星取表PDFは使用しない。",
  },
];
