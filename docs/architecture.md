# アーキテクチャ

## 全体像

```
公式サイト (JFA JSON / 都道府県協会 HTML / PDF)
        │  fetch (robots.txt 尊重・ホスト毎スロットリング・ディスクキャッシュ)
        ▼
Data Source Adapter  ── すべて LeagueDataSource インタフェースに正規化
        │
        ▼
DataSourceRegistry   ── sourceId / scope / region / prefecture / adapter / interval
        │
        ▼
Runner (source 単位・独立ジョブ)  ── 失敗を隔離し dataHealth を更新
        │
        ▼
Repositories (ingest)  ── 大会ツリー・チーム・試合・順位を upsert
        │
        ▼
SQLite (開発) / PostgreSQL・Supabase (本番)
        │
        ▼
Repositories (read) → Server Components → 画面
```

## ディレクトリ

| パス | 役割 |
| --- | --- |
| `src/domain` | enum とドメイン型 |
| `src/db/schema.ts` | Drizzle スキーマ（テーブル定義の単一の真実） |
| `src/db/seed/` | 地域・都道府県・大会ツリー・サンプルデータ |
| `src/data-sources/types.ts` | `LeagueDataSource` インタフェースと DTO |
| `src/data-sources/jfa/` | プレミア・プリンスの公式 JSON アダプタ |
| `src/data-sources/prefectures/` | 47都道府県のカタログと汎用アダプタ |
| `src/data-sources/parse/` | HTML テーブル / CSV / PDF テキスト抽出 |
| `src/data-sources/registry.ts` | ソース台帳 |
| `src/data-sources/runner.ts` | 取得〜取り込み〜ヘルス記録 |
| `src/repositories/` | 読み取りクエリと ingest |
| `src/jobs/` | 更新 CLI と網羅率レポート |
| `src/features/` | 画面単位のロジックとコンポーネント |
| `src/components/` | UI プリミティブ |

## 大会の任意階層

`competitions.parent_competition_id` の自己参照だけで表現します。

```
福岡U-18リーグ                      level=4  category=PREFECTURE
├ 福岡1部                          level=4
├ 福岡2部                          level=4
│ ├ 福岡2部 Aグループ               level=5  （グループリーグ）
│ └ 福岡2部 Bグループ               level=5
├ 福岡3部                          level=4
└ 福岡4部（地区リーグ）              level=5  category=DISTRICT
  ├ 福岡中央地区U-18リーグ           level=6
  ├ 福岡北地区U-18リーグ             level=6
  ├ 北九州地区U-18リーグ             level=6
  └ 筑後地区U-18リーグ               level=6
```

県ごとに構造が違っても、同じ仕組みで表現できます。`level` と `sort_order` は
表示順のためだけに使い、深さの上限はありません。

## Club と Team

- `Club` … 学校・クラブ本体（例：東福岡高校）
- `Team` … 実際に出場するチーム（例：東福岡B、東福岡C）

`Team.name` から `splitTeamName()` が所属（`club_name`）と squad（`B` / `2nd` など）を
推定し、`Club` を自動生成します。A/B/C で所属リーグが違っても問題ありません。

チームの同一性は名前の正規化（NFKC・全半角・空白・末尾の所属表記）から作る
決定的なハッシュ `team-<sha1>` で表現します。情報元をまたいで同じ表記なら同一チームに
集約されます。

## 情報元メタデータ

すべての取得行に以下を付与します。

| カラム | 内容 |
| --- | --- |
| `source_id` | `DataSourceRegistry` のキー |
| `fetched_at` | 取得時刻（ミリ秒） |
| `parser_version` | アダプタのバージョン（例 `jfa-json@1.0.0`） |

画面の `SourceNote` が「出典：情報元名（リンク）／最終取得／parser／状態」を表示します。

## 失敗の隔離

`runSource()` は

1. ソースを `registry` から解決（未登録・無効なら SKIPPED）
2. `getCompetitions` / `getTeams` / `getStandings` / `getMatches` を**個別に** try/catch
3. 1つでも成功し1つでも失敗 → `PARTIAL`、全滅 → `FAILED`、想定内の未実装 → `NEEDS_PARSER`
4. 例外を外へ投げず、`data_health` にエラーと最終成功日時を記録

`runSources()` はワーカー数分の並列で実行し、どのワーカーが落ちても他は継続します。
1県の失敗で全国更新が止まることはありません。

## 取得ポリシー

- `robots.txt` を取得・解析し、Disallow のパスへはアクセスしない
- ホストごとに最小 2 秒の間隔を空ける
- レスポンスは `.cache/data-sources/` に保存し、既定 30 分は再利用する
  （ユーザーのページ閲覧が情報元へのアクセスを発生させない）
- 429/5xx は指数バックオフで最大 2 回再試行
- User-Agent は連絡先を含む `DATA_SOURCE_USER_AGENT` を使用

## PDF の扱い

`src/data-sources/parse/pdf.ts` が FlateDecode ストリームを展開し、`Tj` / `TJ`
オペレータからテキストレイヤーを取り出します。OCR は行いません。テキストが
取れない（スキャン画像のみの）PDF は `NEEDS_PARSER` として記録します。

## 本番 DB への移行

開発環境は Android/PRoot でも動くよう SQLite（`better-sqlite3`）を使っています。
本番は PostgreSQL / Supabase を想定しています。

- すべての ID はテキスト、日時は `timestamp_ms`（ミリ秒）で保持
- `src/db/schema.ts` を `drizzle-orm/pg-core` に置き換え
- `src/db/client.ts` のドライバを `postgres-js` などに差し替え
- `drizzle.config.ts` の `dialect` を `postgresql` に変更

スキーマの形・リポジトリのクエリはそのまま移行できるようにしてあります。
