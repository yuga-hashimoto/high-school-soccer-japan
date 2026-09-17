# データソース一覧（公式ソース台帳）

本サービスが参照する高円宮杯 JFA U-18 サッカーリーグ関連の公式データソースを整理した台帳です。
全国リーグ（プレミア・プリンス）と 47 都道府県リーグを対象とし、それぞれを独立した更新ジョブとして扱います。

## ソース選定ポリシー

- **公式を最優先**：取得元は公式 API / 公式 JSON ＞ 公式 CSV ＞ 公式 HTML ＞ その他、の優先順位で選定する。個人ブログ・まとめサイト・非公式アグリゲータは使用しない。
- **一次情報のみ**：都道府県リーグは各都道府県サッカー協会、または協会が運営する専用公式リーグサイトを一次情報とする。
- **robots.txt / 利用規約の尊重**：`robots.txt` と各サイトの利用規約を確認し、クロールが禁止・制限されているパスにはアクセスしない。
- **キャッシュと低頻度アクセス**：HTTP レスポンスはキャッシュし、`ETag` / `Last-Modified` を尊重する。短時間の連続リクエストや全件の高頻度クロールは行わない。
- **PDF はテキストレイヤーを利用**：PDF のみで公開される場合は埋め込みテキストレイヤーを抽出して解析する。OCR は行わない（レイアウト崩れ・誤認識を避けるため）。
- **URL 検証**：協会 URL は JFA 公式の「47都道府県サッカー協会」一覧（<https://www.jfa.jp/about_jfa/organization/47fa/>）に基づいて確認する。確認できなかったものは `urlVerified: false` とし、備考に「要確認」と記載する。

## 全国リーグ

プレミアリーグと各ブロックのプリンスリーグは JFA 公式サイトが **JSON** を公開しており、
`JfaJsonAdapter`（`src/data-sources/jfa/json-adapter.ts`）で取得・正規化しています。

- 順位: `<path>/match/fight.json` の `competitionStanding`
- 日程・結果: `<path>/match/schedule.json` の `matchScheduleList`
- プレミア: `https://www.jfa.jp/match/takamado_jfa_u18_premier2026/{east|west}/`
- プリンス: `https://www.jfa.jp/match_47fa/<code>/takamado_jfa_u18_prince2026/<group>/`

| 地域 | 大会 | Source | Format | Status | 備考 |
| --- | --- | --- | --- | --- | --- |
| 全国 | プレミアリーグ EAST | `jfa-premier-east` | JSON | ✅ ACTIVE | 公式 JSON から取得 |
| 全国 | プレミアリーグ WEST | `jfa-premier-west` | JSON | ✅ ACTIVE | 公式 JSON から取得 |
| 北海道 | プリンスリーグ北海道 1部 | `jfa-prince-hokkaido-1` | JSON | ✅ ACTIVE | 全国サイトは単一グループ |
| 東北 | プリンスリーグ東北 1部・2部 | `jfa-prince-tohoku` | JSON | NEEDS_PARSER | 今季ページが全国サイトに未公開 |
| 関東 | プリンスリーグ関東 1部・2部 | `jfa-prince-kanto-1` / `-2` | JSON | ✅ ACTIVE | `kanto1` / `kanto2` |
| 北信越 | プリンスリーグ北信越 1部・2部 | `jfa-prince-hokushinetsu-1` / `-2` | JSON | ✅ ACTIVE | `hokushinetsu1` / `hokushinetsu2` |
| 東海 | プリンスリーグ東海 1部 | `jfa-prince-tokai-1` | JSON | ✅ ACTIVE | 単一グループ |
| 関西 | プリンスリーグ関西 1部・2部 | `jfa-prince-kansai-1` / `-2` | JSON | ✅ ACTIVE | `kansai1` / `kansai2` |
| 中国 | プリンスリーグ中国 1部 | `jfa-prince-chugoku-1` | JSON | ✅ ACTIVE | 単一グループ |
| 四国 | プリンスリーグ四国 1部 | `jfa-prince-shikoku-1` | JSON | ✅ ACTIVE | 単一ディビジョン |
| 九州 | プリンスリーグ九州 1部・2部 | `jfa-prince-kyushu-1` / `-2` | JSON | ✅ ACTIVE | `kyushu1` / `kyushu2` |

> 補足：`jfa-premier` / `jfa-prince-<地域>` は 1部・2部を束ねる**大会コンテナ**として登録され、
> 更新ジョブの対象外（`enabled: false`）です。大会ノードの出典表示に使います。

## アダプタ

| アダプタキー | 実装 | 対象 |
| --- | --- | --- |
| `jfa-json` | `src/data-sources/jfa/json-adapter.ts` | プレミア・プリンス（公式 JSON） |
| `prefecture-html` | `src/data-sources/prefectures/generic-html.ts` | 表形式HTML・HTML星取表を公開する県（福岡・佐賀・滋賀・東京・群馬・宮崎） |
| `prefecture-pdf` | `src/data-sources/prefectures/pdf-adapter.ts` | 試合結果PDFを公開する県（長野・奈良）。順位は結果から算出 |
| `needs-parser` | `src/data-sources/unavailable.ts` | 情報元は登録済み・パーサ未実装の県 |
| `aggregate` | （取得なし） | 大会コンテナ |

新しい県に対応する手順は、`src/data-sources/prefectures/catalog.ts` の該当エントリに
`status: "ACTIVE"`・`adapter: "prefecture-html"`・`endpoints`（順位表 URL / 日程 URL）を
追加するだけです。列の並びは表ヘッダーから自動判定するため、実装コードの追加は不要です。
PDF のみの県は `adapter: "prefecture-pdf"` を指定し、`src/data-sources/parse/pdf.ts`
（unpdf による埋め込みテキスト層の抽出）を利用します。

### 派生順位（published table が無い場合）

PDF の結果一覧や、順位表を公開していない情報元では、`standings` テーブルが空になります。
その場合に限り、取り込んだ試合結果から順位を算出します（勝3点・分1点、勝点→得失点差→
総得点の順でランク付け）。算出しているかどうかは、順位表に順位データの出典
（`standings.source_id`）が無いことで判別できます。公開順位表がある情報元では
必ずそちらを優先します。

## 都道府県リーグ（全 47 件）

対象は各都道府県の高円宮杯 JFA U-18 サッカーリーグ。1部・2部は全県共通で、
4部以上を編成する県（DEEP_PREFECTURES）は3部まで自動生成します。

- **実装済み（ACTIVE）**: 23 県 — 秋田 / 福島 / 茨城 / 群馬 / 埼玉 / 東京 / 山梨 / 新潟 / 福井 / 長野 / 静岡 / 愛知 / 滋賀 / 京都 / 兵庫 / 奈良 / 和歌山 / 山口 / 愛媛 / 福岡 / 佐賀 / 熊本 / 宮崎
- **未対応（NEEDS_PARSER）**: 24 県 — hokkaido / aomori / iwate / miyagi / yamagata / tochigi / chiba / kanagawa / toyama / ishikawa / gifu / mie / osaka / tottori / shimane / okayama / hiroshima / tokushima / kagawa / kochi / nagasaki / oita / kagoshima / okinawa

### ACTIVE 県で扱えるデータ種別

| 取得方法 | 県 |
| --- | --- |
| HTML表（順位表） | 福岡・佐賀・滋賀・東京・群馬・熊本 |
| HTML星取表（順位を算出） | 宮崎 |
| PDF結果一覧（順位を算出） | 長野・奈良・秋田・京都(1部/2部) |
| PDF順位表（座標復元） | 新潟・福井・兵庫・和歌山・山口・山梨・茨城・埼玉・静岡・愛媛・福島・京都(3部)・愛知(地区) |

### 全 47 県

| 都道府県 | 地域 | 協会 / サイト | 形式 | Adapter | 取得対象 | Status | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hokkaido | 北海道 | 北海道サッカー協会 | HTML | — | — | NEEDS_PARSER | 第2種(U-18)大会情報(https://www.hfa-dream.or.jp/tournament/2syu/)で高円宮杯JFA U-18サッカーリーグ2026北海道FAリーグおよびブロックリーグの日程表・星取表をPDF公開(例: FAリーグ星取表 /wp-content/uploads/2026/03/202604140204.pdf, 道央 /202604160407 |
| aomori | 東北 | 青森県サッカー協会 | HTML | — | — | NEEDS_PARSER | 2種(高校)ページ(https://www.aomori-fa.jp/category/committee/all-committee/highschool/)の大会記事で高円宮杯JFA U-18サッカーリーグ青森2026の星取表(1部・2部)と大会日程をPDF公開(星取表 /wp/wp-content/uploads/2026/08/星取表0907.pdf、3部後期 星取表_ |
| iwate | 東北 | 岩手県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種ページ(https://www.fa-iwate.com/tournament-event-workshop/second/)から公式データサイトgoalnoteにリンク。順位は https://www.goalnote.net/detail-standings.php?tid=18702 (D1)等にHTML表で掲載されるが、ヘッダが「勝点/試合数/勝利/引分/敗戦/ |
| miyagi | 東北 | 宮城県サッカー協会 | HTML | — | — | NEEDS_PARSER | 宮城県トラック協会杯宮城県リーグU-18 2026(https://www.miyagi-fa.com/news/2nd/2nd-results/2026/03-31-47806/)でM1〜M4の順位表(勝敗表)PDFを公開(例: M1勝敗表 https://www.miyagi-fa.com/cms/wp-content/uploads/2026/03/7b872033acd |
| akita | 東北 | 秋田県サッカー協会 | PDF | PDF | akita-1, akita-2 | ✅ ACTIVE | 2種大会情報(https://fa-akita.net/16943/)の「2026_日程1部・2部･3部(0913更新)」PDF(例: /wp/wp-content/uploads/2026/09/aeac3622ff02fe672c0859a9d94d2c0c-2.pdf)には「A1 10:30 明桜 10 - 0 大曲工」形式の結果が1試合1行で並ぶ。行頭のカテゴリー(A1 |
| yamagata | 東北 | 山形県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種ページの大会ページ(https://www.yfa.jp/archives/4320)に大会要項PDF(https://www.yfa.jp/2023/wp-content/uploads/2026/09/Yリーグ2026_要領.pdf)と、各部(1部/2部A前期/2部B前期/3部A〜D)のgoalnoteリンクを掲載。順位は https://www.goalnote. |
| fukushima | 東北 | 福島県サッカー協会 | PDF | PDF | fukushima-1, fukushima-2 | ✅ ACTIVE | 協会の試合情報ページがF1〜F3リーグの順位表・星取表PDFを公開。座標から順位表を復元する(F1・F2を取得)。 |
| ibaraki | 関東 | 茨城県サッカー協会 | PDF | PDF | ibaraki-1, ibaraki-2 | ✅ ACTIVE | 協会のIFAリーグページが1〜4部の「リーグ戦表」PDFを公開。座標から順位表を復元する(1部・2部を取得)。3部AB・4部各地区は別PDF。 |
| tochigi | 関東 | 栃木県サッカー協会 | HTML | — | — | NEEDS_PARSER | 栃木県サッカー協会公式サイト(http://www.tfa.or.jp/wptfa/)の第2種ページ(?cat=12)は「試合結果速報」を LSIN (http://api.lsin.jp/?c=3&l=35) に委ねている。LSINはJavaScriptで大会一覧・結果を描画するSPAで、取得したHTMLに<table>も結果PDFも含まれない（apires/js で動的取得 |
| gunma | 関東 | 群馬県サッカー協会 | HTML | HTML | gunma-1 | ✅ ACTIVE | 群馬県サッカー協会の2026年度高円宮杯JFA U-18サッカーリーグ群馬ページ。大会データは management.gunma-fa.com の試合結果(/api/table/173)・組み合わせ(/api/match/173)でHTMLテーブルとして公開。順位表ヘッダは「順位/チーム名/勝点/試合数/勝数/引分数/敗数/得点/失点/得失点差」。1つのページに1部〜3部A〜F |
| saitama | 関東 | 埼玉県サッカー協会 | PDF | PDF | saitama-1, saitama-2, saitama-3 | ✅ ACTIVE | 協会のSFAリーグページ(2026)が1〜3部の順位表PDF(914S1-1.pdf 等)を公開。座標から順位表を復元する。 |
| chiba | 関東 | 千葉県サッカー協会 | HTML | — | — | NEEDS_PARSER | 千葉県サッカー協会のU-18リーグページ(https://chiba-fa.gr.jp/08category2/)は1〜5部の試合結果・順位を goalnote.net (1部 tid=18441, 2部 18442, 3部 18580, 4部 18617/19320, 5部 18685/19321) で公開。goalnote.net は robots.txt で全クロール禁止 |
| tokyo | 関東 | 東京都サッカー協会 | HTML | HTML | tokyo-1, tokyo-2, tokyo-3 | ✅ ACTIVE | 東京都サッカー協会が運営する高円宮杯JFA U-18サッカーリーグ東京の専用公式サイト（Tリーグ）。順位表は /rank.php?dt=<部>&dy=2026（ヘッダ:チーム名/勝点/試合数/勝/敗/引/得点/失点/得失点/順位）、試合日程・結果は /schedule.php?dt=<部>&dy=2026（ヘッダ:節/日時/ホームチーム/スコア/アウェイチーム/会場）のHTML |
| kanagawa | 関東 | 神奈川県サッカー協会 | HTML | — | — | NEEDS_PARSER | 神奈川県サッカー協会のU-18リーグページ(https://kanagawa-fa.gr.jp/u18_league/)。順位一覧(https://www.kanagawa-fa.gr.jp/cms/u18-league/2026-2/)は AnWP Football Leagues プラグインがJavaScriptでdivグリッド描画し、静的HTMLに順位表の<table>が |
| yamanashi | 関東 | 山梨県サッカー協会 | PDF | PDF | yamanashi-1, yamanashi-2, yamanashi-3, yamanashi-4 | ✅ ACTIVE | 高円宮杯JFA U-18サッカーリーグ2026山梨ページ(https://www.yamanashi-football.com/pages/75/)の「結 果」星取表PDFから座標を使って1〜4部の順位表を復元（5部はA/Bの2グループに分かれるため未登録）。PDFは勝点/得点/失点/得失点差/順位の列を持つ。ファイル名はタイムスタンプで更新ごとに変わるため、PDFを保持する  |
| niigata | 北信越 | 新潟県サッカー協会 | PDF | PDF | niigata-1 | ✅ ACTIVE | 協会の星取表PDF(2026_result_U18_N1_*.pdf)から座標を使って1部の順位表を復元。勝点・得失点差をPDFの記載どおりに取得する。 |
| toyama | 北信越 | 富山県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会の高円宮杯JFA U-18サッカーリーグ2026富山ページ(https://toyfa.jp/?tid=104362)は、日程・結果を外部システム「大会GO!」(https://www.taikai-go.com/tournaments/groups/7)に委ねている。大会GO!はJavaScript描画のSPAで、取得したHTMLには順位表・試合結果の<table>が含ま |
| ishikawa | 北信越 | 石川県サッカー協会 | HTML | — | — | NEEDS_PARSER | 石川県高体連サッカー専門部サイトの高円宮杯U-18リーグ2026ページ(http://soccer-u18.ishikawa.jp/u-18.html)は、1部/2部/3部それぞれの『日程』PDF(u18/2026/2026_1st.pdf, 2026_2nd.pdf, 2026_3rd.pdf)のみを公開している。PDFの中身は対戦カード・会場・時刻だけでスコアや順位表を含ま |
| fukui | 北信越 | 福井県サッカー協会 | PDF | PDF | fukui-1, fukui-2, fukui-3 | ✅ ACTIVE | 協会ページ(高円宮杯JFA U-18サッカーリーグ2026福井)はF1〜F4リーグの順位表・星取表をPDFで公開。PDFのファイル名がハッシュ化されておりpdfLinkPatternで自動選択できないため、各リーグのPDFを直接指定する。F2・F3の星取表は座標から順位表(チーム名/勝点/得点/失点/得失差/順位)を正しく復元でき、fukui-2とfukui-3で各8行を取得し |
| nagano | 北信越 | 長野県サッカー協会 | PDF | PDF | nagano-1, nagano-2 | ✅ ACTIVE | 協会2種ページ(https://www.nagano-fa.or.jp/cat_2)が1部/2部A/2部B/3部/4部の「日程・試合結果」をPDFで公開。埋め込みテキスト層から試合結果を読み取り、順位は結果から算出する。星取表PDFは使用しない。 |
| gifu | 東海 | 岐阜県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種(高校･ユース)ページのG1〜G4リーグ各節結果・順位をPDFで公開(例: G1 https://www.gifu-fa.com/wp/wp-content/uploads/2026/08/26f559a253f3b61e46951a7db5801db4.pdf)。しかしG1/G2の戦績表(星取表)は見出しセルが「勝/点」「得/点」のように縦に分割されて抽出されるため、 |
| shizuoka | 東海 | 静岡県サッカー協会 | PDF | PDF | shizuoka-a, shizuoka-b, shizuoka-c | ✅ ACTIVE | 協会の高円宮杯U-18ページがA/B/Cリーグの結果PDFを公開。ファイル名はハッシュだがリンク文言が一定のため、リンク文言で選択して座標から順位表を復元する。 |
| aichi | 東海 | 愛知県サッカー協会 | PDF | PDF | aichi-higashimikawa-1, aichi-higashimikawa-2, aichi-nishimikawa-1, aichi-nishimikawa-2, aichi-nagoya-1, aichi-chita-1, aichi-higashioari-1, aichi-higashioari-2, aichi-nishioari-1 | ✅ ACTIVE | 協会の高円宮杯U-18ページが各地区リーグの星取表・結果PDFを公開。座標から順位表を復元する。愛知は地区リーグ制のため、地区ごとにCompetitionを分けて登録している。 |
| mie | 東海 | 三重県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種委員会2025ページ(https://www.fa-mie.jp/17339/)の高円宮杯JFA U-18サッカーリーグ2025について、1部/2部の星取表PDF(.../2025/12/ccc51bad..., .../2025/12/233c7eb3...)は『チーム名/勝点/得失点差/総得点/総失点』の並びでパーサが順位表10行を正しく抽出できる。ただしこれらは2 |
| shiga | 関西 | 滋賀県サッカー協会 | HTML | HTML | shiga-1, shiga-2, shiga-3-a, shiga-3-b | ✅ ACTIVE | 滋賀県サッカー協会が運営する専用公式サイト。1部〜3部を順位表(/order/<部>/<年>)・試合結果(/match/<部>/<年>)としてHTMLで公開。3部はA/Bの2グループ制で、group_id=1001(A)/1002(B)を指定して取得する。4部は前期A〜D・後期A〜Eの複数ブロック制で順位が前期と後期に分かれるため、本設定では1部〜3部のみを対象とする。 |
| kyoto | 関西 | 京都府サッカー協会 | PDF | PDF | kyoto-1, kyoto-2, kyoto-3-a, kyoto-3-b | ✅ ACTIVE | 協会のU18リーグページが1〜4部の結果PDF・順位表PDFを公開。PDF配信がRefererを要求するため付与して取得する。1部・2部は結果一覧から順位を算出、3部は順位表PDF(A/B)を座標復元する。 |
| osaka | 関西 | 大阪府サッカー協会 | HTML | — | — | NEEDS_PARSER | 大阪府サッカー協会2種委員会の『高円宮杯JFA U-18サッカーリーグ2026 OSAKA』ページは、1部〜3部の試合予定をPDF(https://osaka-fa.or.jp/2shu/wp-content/uploads/sites/6/2026/.../U18_div*.pdf)で公開するが、いずれも『試合予定』でスコアを含まない。試合結果・順位は技術委員会CGI(htt |
| hyogo | 関西 | 兵庫県サッカー協会 | PDF | PDF | hyogo-1, hyogo-2 | ✅ ACTIVE | 協会の「U-18県リーグ試合結果表」PDFから、座標を使って1部・2部の順位表をセクション別に復元。 |
| nara | 関西 | 奈良県サッカー協会 | PDF | PDF | nara-1, nara-2, nara-3-a, nara-3-b | ✅ ACTIVE | 協会サイト(奈良県U-18リーグ)が1部〜3部の日程・結果を1つのPDFで公開。各行が「1部 1節 9:30 奈良クラブユース 11-0 五條 会場」の形式で、部・グループ(3部A/3部B)で絞り込んで取り込む。順位は結果から算出。 |
| wakayama | 関西 | 和歌山県サッカー協会 | PDF | PDF | wakayama-3 | ✅ ACTIVE | 協会ページ(pages/350)が『高円宮杯JFA U-18サッカーリーグ2026和歌山』1部〜3部の試合結果PDFを公開。1部・2部は前期/後期を2行に分けた星取表で、順位表のチーム名行と数値行が座標上ずれており座標リーダーでは正しく対応付かない(取材結果も全角ハイフン『－』と○/●/△区切りで汎用の試合結果行パーサの対象外)。3部は通年1行のため座標リーダーで順位表を復元で |
| tottori | 中国 | 鳥取県サッカー協会 | HTML | — | — | NEEDS_PARSER | 2026年度は「高円宮杯 JFA U-18サッカーリーグ2026鳥取わかとりリーグ」として協会公式サイトのリーグページ(https://www.fa-tottori.com/?p=24838)で告知されるが、1部〜3部の日程・結果はすべて外部の GoalNote クラウド(1部前期 https://www.goalnote.net/detail-schedule.php?tid |
| shimane | 中国 | 島根県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種ページ(https://www.fa-shimane.or.jp/kinds/category2)は「プリンスリーグ・島根県ユースリーグの日程および結果…はスポーツオンラインをご確認ください」と案内するのみで、2026年度の順位表・結果ページは協会サイトに存在しない(最新のお知らせは2021年度まで)。結果は SportsOnline (http://www.sport |
| okayama | 中国 | 岡山県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種ページ(https://okayama-fa.or.jp/2022/2-2)の「高円宮杯 JFA U-18 サッカーリーグ OKAYAMA 2026」は PDF(https://okayama-fa.or.jp/2022/wp-content/uploads/2026/09/2026_U18L.pdf)のみ。中身は県1部・2部の対戦表で、1行に左右2試合が連結してテキス |
| hiroshima | 中国 | 広島県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会 2種カテゴリ(https://www.hifa.jp/competition/category/cat2/)の高円宮杯 U-18 サッカーリーグ広島は2025年度ページ(https://www.hifa.jp/competition/2025/06/12/高円宮杯-jfa-u-18サッカーリーグ2025-広島/)までで、2026年度ページは未公開。試合結果は同ページから  |
| yamaguchi | 中国 | 山口県サッカー協会 | PDF | PDF | yamaguchi-1, yamaguchi-2 | ✅ ACTIVE | 「高円宮杯 JFA U-18 サッカーリーグ2026 山口県ユースリーグ」(https://yamaguchi-fa.com/archives/16620)が1部・2部の「日程・結果」PDF(y.l2026_1bu_keka-1.pdf / y.l2026_2bu_keka.pdf)を公開。星取表の右側に座標で順位表を読み取り、勝点・順位・得失点差を取得する。 |
| tokushima | 四国 | 徳島県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会のTリーグページが結果PDF(t2026*.pdf)を公開しているが、行が「ホーム 得点-得点 (前半,後半) アウェイ」形式で、括弧内の内訳がチーム名として誤認されるため未対応。形式が確定でき次第対応する。 |
| kagawa | 四国 | 香川県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種リーグページ(https://www.kagawa-fa.jp/2nd/2nd_league.html)の2026年度は1部・2部・3部とも GoalNote クラウドへのリンクのみ(1部 https://www.goalnote.net/detail.php?tid=18633、2部 tid=18634、3部 tid=18635)で、協会ホストの順位表 PDF/HTM |
| ehime | 四国 | 愛媛県サッカー協会 | PDF | PDF | ehime-2-a, ehime-2-b | ✅ ACTIVE | 協会ページが1部/2部A/2部B/3部の星取表PDFを公開。座標から順位表を復元する(2部A/Bを取得)。1部はPDFレイアウトが異なるため未取得。 |
| kochi | 四国 | 高知県サッカー協会 | HTML | — | — | NEEDS_PARSER | 協会2種ページ(https://www.kochi-fa.com/class02/class02sch/entry-305.html)の2026年度は1部・2部・3部を PDF で公開しているが、配布が media-download URL(例: https://www.kochi-fa.com/media-download/6383/8b55d66cc74933cb/)で、拡 |
| fukuoka | 九州 | 福岡県サッカー協会 | HTML | HTML | fukuoka-1, fukuoka-2, fukuoka-3 | ✅ ACTIVE | 福岡県サッカー協会が運営する専用公式サイト。1部〜3部を順位表(/order/<部>/<年>)・試合結果(/match/<部>/<年>)・星取表(/table/index/<部>/<年>)としてHTMLで公開。 |
| saga | 九州 | 佐賀県サッカー協会 | HTML | HTML | saga-1, saga-2, saga-3 | ✅ ACTIVE | 佐賀県サッカー協会の公式リーグサイト「サガんリーグU-18」。順位表はヘッダーが「順位/チーム名/勝点/試合数/勝数/引分数/敗数/得点/失点/得失点差」、試合結果は「キックオフ/試合状況/試合会場」でスコアが「2 - 0 試合終了」形式のHTMLテーブル。1部〜3部を実フェッチで確認(佐賀は3部も extras で登録)。 |
| nagasaki | 九州 | 長崎県サッカー協会 | HTML | — | — | NEEDS_PARSER | 長崎県サッカー協会サイト(nfa.or.jp)の高校2種ページ/大会情報には高円宮杯U-18長崎県リーグの結果・順位を掲載したPDFが存在せず、2026年リーグの1部・2部はGoalNoteクラウド(https://www.goalnote.net/detail-standings.php?tid=18526 / tid=18527)のみで公開されている。goalnote.ne |
| kumamoto | 九州 | 熊本県サッカー協会 | HTML | HTML | kumamoto-1, kumamoto-2-a, kumamoto-2-b | ✅ ACTIVE | 熊本県サッカー協会の公式リーグシステム(kumamoto-fa.net)。順位表(/league/competition/ranking?id=...)は「順位/チーム名/試合/勝点/勝/分/敗/得点/失点/得失」のHTMLテーブルで公開されており、順位も含めてそのまま取得できる。2026年は1部=id1006、2部A=id1004、2部B=id1005。2部はA/Bの2グルー |
| oita | 九州 | 大分県サッカー協会 | HTML | — | — | NEEDS_PARSER | 大分県サッカー協会(OFAリーグ)は順位・結果をPDF(対戦表・星取表)のみで公開(https://www.ofa.or.jp/news/12521/ から1部〜3部にリンク)。対戦表(例: 2026ofa1tenkouki-1.pdf)は「時間 ホーム vs アウェイ 得点」の順で得点が行末に置かれ、既存のPDF結果パーサ(得点がホームとアウェイの間にある形式のみ対応)では1 |
| miyazaki | 九州 | 宮崎県サッカー協会 | HTML | HTML | miyazaki-1, miyazaki-2, miyazaki-3 | ✅ ACTIVE | 宮崎県U-18リーグ公式サイト(apage.jp)。各表は星取表で、見出し(県1部前期/後期など)ごとに部を判定。行をホーム、列をアウェイとして結果を読み取り、順位は結果から算出。 |
| kagoshima | 九州 | 鹿児島県サッカー協会 | HTML | — | — | NEEDS_PARSER | 鹿児島県サッカー協会2種委員会は「高円宮杯 JFA U-18サッカーリーグ 2026(1部・2部)日程表」(https://www.kagoshima-fa.jp/nisyu/wp-content/uploads/sites/6/2026/03/e1051f0654aae7af0b33c8ba3110578d.pdf)をPDFで公開しているが、内容は対戦カードのみでスコア・勝点 |
| okinawa | 九州 | 沖縄県サッカー協会 | HTML | — | — | NEEDS_PARSER | 沖縄県サッカー協会サイト(okinawafa.com)の2種委員会・試合結果ページには高円宮杯U-18リーグ(波布リーグ)の結果・順位を掲載したPDFが無く、リーグは波布リーグ公式サイト(http://www.okinawa-soccer-habu.com/)のHTMLのみで公開されている。星取表(/scores/sheet/<id>、1部=161)は<tr>閉じタグが欠落した |

## カバレッジ集計（都道府県リーグ）

| 地域 | ACTIVE | NEEDS_PARSER | 計 |
| --- | ---: | ---: | ---: |
| 北海道 | 0 | 1 | 1 |
| 東北 | 2 | 4 | 6 |
| 関東 | 5 | 3 | 8 |
| 北信越 | 3 | 2 | 5 |
| 東海 | 2 | 2 | 4 |
| 関西 | 5 | 1 | 6 |
| 中国 | 1 | 4 | 5 |
| 四国 | 1 | 3 | 4 |
| 九州 | 4 | 4 | 8 |
| **合計** | **23** | **24** | **47** |

## 残り24県の理由（すべて個別に確認済み）


### 1. robots.txt により取得しない（方針）

岩手・山形・千葉・鳥取・香川・長崎。
公式の順位表は GoalNote（goalnote.net）上にありますが、同サイトの robots.txt が
`User-Agent: * / Disallow: /` で全クロールを禁止しています。協会サイト側に代替の
PDF・HTMLが無いことも個別に確認しました。

### 2. PDFの星取表（座標ベースの行列解析が必要）

北海道・青森・大分・鹿児島・岡山・広島。星取表PDFは行と列の交差セルで結果を表し、
集計列（勝点/得失点差/順位）が縦組みでセルと離れた位置にあります。表の座標復元は
実装済みですが、星取行列の復元は誤順位のリスクが高く未対応としています。

### 3. ページ・PDFの形式が非対応

宮城（robots が `/cms/` を禁止、PDFも同配下）・栃木・神奈川・富山（JS描画SPA）・
石川・岐阜・三重・島根・徳島・高知。

### 4. 今季データ未公開 / 自動取得拒否

京都の4部・大阪（外部CGIが403）・沖縄（403）・愛媛の1部/3部・奈良の4部など。

いずれも情報元の登録は完了しており、管理画面（/admin/health）で状態を確認できます。

## 更新ジョブ

- 各ソースは **独立した更新ジョブ** として実行する（例：`update-fukuoka`、`update-premier`、`update-premier-east`、`update-prince-kanto`、`update-aomori` …）。1 つのジョブの失敗が他のジョブを停止させてはならない。ジョブは互いに独立して timeout・retry・隔離される。
- 実行対象はレジストリの `enabled()` で選択し、`updateIntervalMinutes` に基づいて次回実行時刻を判定する。福岡は 120 分、それ以外は 720 分。
- 平常時は **1 日数回**（およそ 6〜12 時間おき）、**試合日はおよそ 1 時間おき** に更新する。
- 取得失敗時は指数バックオフで再試行し、連続失敗が閾値を超えたら `ERROR` / `NEEDS_PARSER` として記録してアラートを出す。

## データ欠損の扱い

- 取得できないソースは `NEEDS_PARSER`（公式ページはあるがパーサ未実装）または `UNSUPPORTED`（公式の U-18 リーグページが見つからない）として**明示的に登録**する。黙って一覧から除外することはしない。
- 一時的な取得失敗は `ERROR`、恒久的に対応不能なものは `UNSUPPORTED` として区別する。
- データを取得できないソースを参照する画面では「**現在データを取得できません**」と表示し、併せて**最後に取得に成功した日時**を提示する。

