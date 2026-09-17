import Link from "next/link";
import { formatDateTime } from "@/components/empty-state";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { getCoverageSummary, listSourceHealth } from "@/repositories/health";

export const metadata = { title: "データ状況" };

const STATUS_LABEL: Record<string, string> = {
  OK: "正常",
  PARTIAL: "一部",
  FAILED: "失敗",
  UNKNOWN: "未取得",
};

function statusClass(status: string): string {
  if (status === "OK") return "text-positive";
  if (status === "PARTIAL") return "text-warn";
  if (status === "FAILED") return "text-negative";
  return "text-muted";
}

export default function HealthPage() {
  const coverage = getCoverageSummary();
  const sources = listSourceHealth();

  const prefecturesByRegion = new Map<string, typeof sources>();
  for (const source of sources) {
    if (source.scope !== "PREFECTURE") continue;
    const key = source.regionName ?? "その他";
    const bucket = prefecturesByRegion.get(key) ?? [];
    bucket.push(source);
    prefecturesByRegion.set(key, bucket);
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="データ状況"
        meta="全国の取得状況（管理用）"
        backHref="/"
        backLabel="ホーム"
      />

      <SectionTitle>網羅率</SectionTitle>
      <div className="mx-4 rounded-lg border border-line p-4">
        <p className="text-[13px] text-ink-soft">
          47都道府県中 {coverage.prefectures.ok + coverage.prefectures.partial} 対応
          ／ 未対応 {coverage.prefectures.missing}
          {coverage.prefectures.failed > 0
            ? ` ／ 失敗 ${coverage.prefectures.failed}`
            : ""}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Tier label="プレミア" bucket={coverage.tiers.premier} />
          <Tier label="プリンス" bucket={coverage.tiers.prince} />
          <Tier label="都道府県" bucket={coverage.tiers.prefecture} />
        </div>
        <p className="mt-3 text-[12px] text-muted">
          チーム {coverage.totals.teams} ／ 試合 {coverage.totals.matches} ／ 順位行{" "}
          {coverage.totals.standings} ／ リーグ {coverage.totals.competitions}
        </p>
      </div>

      <SectionTitle>地域別</SectionTitle>
      <ul className="divide-y divide-line border-y border-line">
        {coverage.regions.map((region) => (
          <li key={region.regionSlug} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-16 shrink-0 text-[13px]">{region.regionName}</span>
            <span className="flex-1 text-[12px] text-muted">
              正常 {region.ok} ／ 一部 {region.partial} ／ 未対応 {region.missing}
              {region.failed > 0 ? ` ／ 失敗 ${region.failed}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <SectionTitle>情報元の状態</SectionTitle>
      {[...prefecturesByRegion.entries()].map(([regionName, rows]) => (
        <section key={regionName}>
          <h3 className="bg-accent-soft px-4 py-1.5 text-[12px] text-ink-soft">
            {regionName}
          </h3>
          <ul className="divide-y divide-line border-b border-line">
            {rows
              .sort((a, b) => (a.prefectureName ?? "").localeCompare(b.prefectureName ?? "", "ja"))
              .map((source) => (
                <li key={source.sourceId} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px]">
                      {source.prefectureName ?? source.name}
                    </span>
                    <span className={`shrink-0 text-[12px] ${statusClass(source.healthStatus)}`}>
                      {STATUS_LABEL[source.healthStatus] ?? source.healthStatus}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    最終成功 {formatDateTime(source.lastSuccessAt)}
                    {source.teamCount > 0 ? ` ・ チーム${source.teamCount}` : ""}
                    {source.matchCount > 0 ? ` ・ 試合${source.matchCount}` : ""}
                  </div>
                  {source.lastError ? (
                    <div className="mt-0.5 truncate text-[11px] text-negative">
                      {source.lastError}
                    </div>
                  ) : null}
                  <div className="mt-0.5 truncate text-[11px] text-muted">
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent"
                    >
                      情報元
                    </a>
                    {source.notes ? ` ・ ${source.notes}` : ""}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <SectionTitle>全国の情報元</SectionTitle>
      <ul className="divide-y divide-line border-y border-line">
        {sources
          .filter((source) => source.scope !== "PREFECTURE")
          .map((source) => (
            <li key={source.sourceId} className="flex items-baseline justify-between gap-2 px-4 py-2.5">
              <span className="min-w-0 truncate text-[13px]">{source.name}</span>
              <span className={`shrink-0 text-[12px] ${statusClass(source.healthStatus)}`}>
                {STATUS_LABEL[source.healthStatus] ?? source.healthStatus}
              </span>
            </li>
          ))}
      </ul>

      <p className="px-4 pt-6 text-[11px] text-muted">
        更新は <code>npm run job:update -- --all</code> で実行します。1つの情報元が
        失敗しても、他の情報元の更新は継続します。
      </p>
      <p className="px-4 pt-2 text-[11px] text-muted">
        <Link href="/" className="text-accent">
          ホームへ戻る
        </Link>
      </p>
    </div>
  );
}

function Tier({
  label,
  bucket,
}: {
  label: string;
  bucket: { total: number; ok: number; partial: number; missing: number; failed: number };
}) {
  return (
    <div className="rounded-md border border-line py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular mt-0.5 text-[15px] font-semibold">
        {bucket.ok + bucket.partial}/{bucket.total}
      </div>
      {bucket.failed > 0 ? (
        <div className="text-[10px] text-negative">失敗 {bucket.failed}</div>
      ) : null}
    </div>
  );
}
