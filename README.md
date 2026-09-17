# 高校サッカーリーグ全国

日本全国の高校年代サッカーリーグ（高円宮杯 JFA U-18 プレミア／プリンス、47都道府県リーグ）を
スマートフォンから一元的に閲覧できる Web アプリ / PWA です。

- ホーム → リーグ → 地域 / 都道府県 → リーグ → 順位 / 日程 / 得点 という単純な導線
- 白背景・ブルーのアクセント・List UI・390px 前後のスマートフォン最優先
- 全国規模の複雑さ（階層・情報元の違い・欠損）はすべてバックエンドで吸収する

## クイックスタート

```bash
npm install
npm run db:setup          # スキーマ作成 + 構造データと動作確認用データを投入
npm run job:update -- --all   # 公式サイトから実データを取得（初回は数分）
npm run dev
```

http://localhost:3000 を開きます。

`job:update` はネットワークが必要です。実行しない場合でも、同梱のサンプルデータ
（出典「初期サンプルデータ」）で全画面を確認できます。

### 現在の全国カバレッジ

- プレミアリーグ EAST / WEST: **2/2**
- プリンスリーグ 8ブロック12ディビジョン: **12/12**（東北のみ今季ページ未公開）
- 都道府県リーグ: **23/47**
  - HTML順位表: 福岡・佐賀・滋賀・東京・群馬・熊本
  - HTML星取表（順位を算出）: 宮崎
  - PDF結果一覧（順位を算出）: 長野・奈良・秋田・京都(1部/2部)
  - PDF順位表（座標復元）: 新潟・福井・兵庫・和歌山・山口・山梨・茨城・埼玉・静岡・愛媛・福島・京都(3部)・愛知(地区9リーグ)
- 残り24県は情報元URLと理由を `docs/data-sources.md` に記録しています
  （GoalNoteのrobots.txt禁止6県、PDF星取表、JS描画SPA、HTTP 403など）

### データ取得の仕組み

| アダプタ | 用途 |
| --- | --- |
| `jfa-json` | JFA公式JSON（プレミア・プリンス） |
| `prefecture-html` | 表形式HTML・HTML星取表 |
| `prefecture-pdf` | 結果一覧PDF（1試合1行）と、座標復元による順位表PDF |

PDFの順位表は、埋め込みテキストの座標から行・列を復元し、見出し（勝点・得失点差・順位）に
数値を対応付けます。公開順位表が無い場合は試合結果から順位を算出し、画面に出典と
「結果から算出」である旨を明示します。

## 構成

```
src/
  app/            画面（App Router）と API
  components/     UI プリミティブ（List / Tabs / SourceNote など）
  features/       competitions, standings, matches, teams, search, favorites
  data-sources/   取得アダプタ
    jfa/          プレミア・プリンス（公式 JSON）
    prefectures/  47都道府県カタログ + 汎用HTML/PDFアダプタ
    parse/        HTML / CSV / PDF のパーサ
  domain/         ドメイン型と enum
  db/             スキーマ・シード
  repositories/   読み取りクエリと取り込み（ingest）
  jobs/           更新ジョブ CLI
```

詳細は [`docs/architecture.md`](docs/architecture.md)、情報元の台帳は
[`docs/data-sources.md`](docs/data-sources.md) を参照してください。

## データモデル（要点）

- `Competition` は `parent_competition_id` による**任意階層**。1部/2部/3部でも、
  地区・グループ・上位下位リーグでも表現できます。
- `Club`（学校・クラブ）と `Team`（A/B/C などの参加チーム）を分離。
- すべての取得データに `sourceId` / `fetchedAt` / `parserVersion` を付与し、
  画面の「出典」から情報元へ遷移できます。
- `data_health` が情報元ごとの状態・最終成功・件数・エラーを保持し、
  `/admin/health` で全国の網羅率を確認できます。

## UI の原則

1画面1目的。ホームには「お気に入りチーム」「今日の試合」「よく見るリーグ」だけを置き、
リーグ階層は 全国 / 地域 / 都道府県 の3タブに分けています。
順位表は **順位・チーム・勝点・得失点差** の4列のみで、試合数や勝敗の内訳は
チーム画面に置いています。

## 本番デプロイ

開発・デモは自己完結した SQLite（`data/app.db`）で動作します。本番は PostgreSQL /
Supabase を想定しており、切り替えは `src/db/client.ts` のドライバと
`drizzle.config.ts` の dialect を `postgresql` に変更するだけで移行できるよう、
ID はすべてテキスト、日時はミリ秒精度で保持しています。

更新ジョブは `.github/workflows/update-data.yml` で定期実行します
（通常は1日数回、試合開催日は1時間間隔。`--respect-interval` がソースごとの
更新間隔を見て実行可否を決めます）。
