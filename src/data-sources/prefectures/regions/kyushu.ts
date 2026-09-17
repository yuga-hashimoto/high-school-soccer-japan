import type { PrefectureSourceInput } from "./types";

/** 九州ブロック。 */
export const KYUSHU: PrefectureSourceInput[] = [
  {
    slug: "fukuoka",
    associationName: "福岡県サッカー協会",
    url: "https://fukuoka-fa-u18.com/",
    format: "HTML",
    status: "ACTIVE",
    urlVerified: true,
    adapter: "prefecture-html",
    endpoints: [
      {
        competitionSlug: "fukuoka-1",
        standingsUrl: "https://fukuoka-fa-u18.com/order/1/2026",
        matchesUrl: "https://fukuoka-fa-u18.com/match/1/2026",
      },
      {
        competitionSlug: "fukuoka-2",
        standingsUrl: "https://fukuoka-fa-u18.com/order/2/2026",
        matchesUrl: "https://fukuoka-fa-u18.com/match/2/2026",
      },
      {
        competitionSlug: "fukuoka-3",
        standingsUrl: "https://fukuoka-fa-u18.com/order/3/2026",
        matchesUrl: "https://fukuoka-fa-u18.com/match/3/2026",
      },
    ],
    notes:
      "福岡県サッカー協会が運営する専用公式サイト。1部〜3部を順位表(/order/<部>/<年>)・試合結果(/match/<部>/<年>)・星取表(/table/index/<部>/<年>)としてHTMLで公開。",
  },
  {
    slug: "saga",
    associationName: "佐賀県サッカー協会",
    url: "https://saga-fa-u18.com/",
    format: "HTML",
    status: "ACTIVE",
    urlVerified: true,
    adapter: "prefecture-html",
    endpoints: [
      {
        competitionSlug: "saga-1",
        standingsUrl: "https://saga-fa-u18.com/order/1/2026",
        matchesUrl: "https://saga-fa-u18.com/match/1/2026",
      },
      {
        competitionSlug: "saga-2",
        standingsUrl: "https://saga-fa-u18.com/order/2/2026",
        matchesUrl: "https://saga-fa-u18.com/match/2/2026",
      },
      {
        competitionSlug: "saga-3",
        standingsUrl: "https://saga-fa-u18.com/order/3/2026",
        matchesUrl: "https://saga-fa-u18.com/match/3/2026",
      },
    ],
    extras: [
      {
        slug: "saga-3",
        name: "佐賀3部",
        level: 4,
        parentSlug: "saga",
        sortOrder: 3,
      },
    ],
    notes:
      "佐賀県サッカー協会の公式リーグサイト「サガんリーグU-18」。順位表はヘッダーが「順位/チーム名/勝点/試合数/勝数/引分数/敗数/得点/失点/得失点差」、試合結果は「キックオフ/試合状況/試合会場」でスコアが「2 - 0 試合終了」形式のHTMLテーブル。1部〜3部を実フェッチで確認(佐賀は3部も extras で登録)。",
  },
  {
    slug: "nagasaki",
    associationName: "長崎県サッカー協会",
    url: "https://www.nfa.or.jp/",
    urlVerified: true,
    notes:
      "長崎県サッカー協会サイト(nfa.or.jp)の高校2種ページ/大会情報には高円宮杯U-18長崎県リーグの結果・順位を掲載したPDFが存在せず、2026年リーグの1部・2部はGoalNoteクラウド(https://www.goalnote.net/detail-standings.php?tid=18526 / tid=18527)のみで公開されている。goalnote.net は robots.txt が「User-Agent:* Disallow:/」で全クロール禁止のため取得できない。協会PDFが確認できないためNEEDS_PARSER。",
  },
  {
    slug: "kumamoto",
    associationName: "熊本県サッカー協会",
    url: "https://kumamoto-fa.net/league/competition/ranking?id=1006",
    format: "HTML",
    status: "ACTIVE",
    adapter: "prefecture-html",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "kumamoto-1",
        standingsUrl: "https://kumamoto-fa.net/league/competition/ranking?id=1006",
      },
      {
        competitionSlug: "kumamoto-2-a",
        standingsUrl: "https://kumamoto-fa.net/league/competition/ranking?id=1004",
      },
      {
        competitionSlug: "kumamoto-2-b",
        standingsUrl: "https://kumamoto-fa.net/league/competition/ranking?id=1005",
      },
    ],
    extras: [
      {
        slug: "kumamoto-2-a",
        name: "熊本2部 Aグループ",
        level: 5,
        parentSlug: "kumamoto-2",
        sortOrder: 1,
      },
      {
        slug: "kumamoto-2-b",
        name: "熊本2部 Bグループ",
        level: 5,
        parentSlug: "kumamoto-2",
        sortOrder: 2,
      },
    ],
    notes:
      "熊本県サッカー協会の公式リーグシステム(kumamoto-fa.net)。順位表(/league/competition/ranking?id=...)は「順位/チーム名/試合/勝点/勝/分/敗/得点/失点/得失」のHTMLテーブルで公開されており、順位も含めてそのまま取得できる。2026年は1部=id1006、2部A=id1004、2部B=id1005。2部はA/Bの2グループ制のため、グループ単位のエンドポイントをextrasとして登録する。試合日程・結果(/league/competition/gamelist/?id=...)は1試合をホーム行・アウェイ行の2行に分け、スコアを前半・後半・合計の別セルに持つ形式のため本設定では取得しない(順位表のみ)。",
  },
  {
    slug: "oita",
    associationName: "大分県サッカー協会",
    url: "https://www.ofa.or.jp/",
    urlVerified: true,
    notes:
      "大分県サッカー協会(OFAリーグ)は順位・結果をPDF(対戦表・星取表)のみで公開(https://www.ofa.or.jp/news/12521/ から1部〜3部にリンク)。対戦表(例: 2026ofa1tenkouki-1.pdf)は「時間 ホーム vs アウェイ 得点」の順で得点が行末に置かれ、既存のPDF結果パーサ(得点がホームとアウェイの間にある形式のみ対応)では1試合も読み取れない。星取表(例: 2026ofa1hoshikouki.pdf)も順位表の見出し「勝点」が「勝」「点」の2テキストに分割されており、PDF順位表リーダー(1セルに「勝点」を要求)では復元できない。両形式とも現行アダプタの対応範囲外のためNEEDS_PARSER。",
  },
  {
    slug: "miyazaki",
    associationName: "宮崎県サッカー協会",
    url: "https://miyazaki-u18.apage.jp/",
    format: "HTML",
    status: "ACTIVE",
    adapter: "prefecture-html",
    urlVerified: true,
    endpoints: [
      {
        competitionSlug: "miyazaki-1",
        standingsUrl: "https://miyazaki-u18.apage.jp/",
        matrix: true,
        sectionFilter: "県1部",
      },
      {
        competitionSlug: "miyazaki-2",
        standingsUrl: "https://miyazaki-u18.apage.jp/",
        matrix: true,
        sectionFilter: "県2部",
      },
      {
        competitionSlug: "miyazaki-3",
        standingsUrl: "https://miyazaki-u18.apage.jp/",
        matrix: true,
        sectionFilter: "県3部",
      },
    ],
    extras: [
      { slug: "miyazaki-3", name: "宮崎3部", level: 4, parentSlug: "miyazaki", sortOrder: 3 },
    ],
    notes:
      "宮崎県U-18リーグ公式サイト(apage.jp)。各表は星取表で、見出し(県1部前期/後期など)ごとに部を判定。行をホーム、列をアウェイとして結果を読み取り、順位は結果から算出。",
  },
  {
    slug: "kagoshima",
    associationName: "鹿児島県サッカー協会",
    url: "https://www.kagoshima-fa.jp/",
    urlVerified: true,
    notes:
      "鹿児島県サッカー協会2種委員会は「高円宮杯 JFA U-18サッカーリーグ 2026(1部・2部)日程表」(https://www.kagoshima-fa.jp/nisyu/wp-content/uploads/sites/6/2026/03/e1051f0654aae7af0b33c8ba3110578d.pdf)をPDFで公開しているが、内容は対戦カードのみでスコア・勝点が一切含まれない(2026-03-31最終更新、4ページ)。2025年分は「戦績表」「最終順位表」PDFが公開されているが2026年分は未公開。日程表・結果とも現行アダプタで読み取れる数値情報が無いためNEEDS_PARSER。",
  },
  {
    slug: "okinawa",
    associationName: "沖縄県サッカー協会",
    url: "https://okinawafa.com/",
    urlVerified: true,
    notes:
      "沖縄県サッカー協会サイト(okinawafa.com)の2種委員会・試合結果ページには高円宮杯U-18リーグ(波布リーグ)の結果・順位を掲載したPDFが無く、リーグは波布リーグ公式サイト(http://www.okinawa-soccer-habu.com/)のHTMLのみで公開されている。星取表(/scores/sheet/<id>、1部=161)は<tr>閉じタグが欠落した不正なHTMLで汎用パーサが表として認識できず、試合結果(/scores/table/<id>)も得点セルが「1 - 4 1 - 2」の形式でホーム/アウェイの間に無いため正しく取得できない。協会PDFが確認できないためNEEDS_PARSER。",
  },
];
