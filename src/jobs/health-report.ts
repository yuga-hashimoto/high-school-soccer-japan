import { getCoverageSummary, listSourceHealth, getStaleSources } from "@/repositories/health";
import { registerAllSources } from "@/data-sources";
import { formatDateTime } from "@/components/empty-state";

/**
 * Prints the nationwide coverage report.
 *
 * Data sources fail for ordinary reasons (a site is down, a bot is blocked), so
 * by default this never fails the pipeline — the report and the stored
 * `data_health` rows are the signal. Pass `--strict` to exit 1 when a source is
 * failing, for use by an alerting job.
 */
async function main(): Promise<void> {
  registerAllSources();
  const coverage = getCoverageSummary();
  const health = listSourceHealth();
  const stale = getStaleSources();

  const line = (label: string, value: string) => console.log(`${label.padEnd(14)} ${value}`);

  console.log("== 全国網羅率 ==");
  line(
    "都道府県",
    `${coverage.prefectures.ok + coverage.prefectures.partial}/${coverage.prefectures.total} 対応 ` +
      `(正常 ${coverage.prefectures.ok} / 一部 ${coverage.prefectures.partial} / 未対応 ${coverage.prefectures.missing} / 失敗 ${coverage.prefectures.failed})`,
  );
  line(
    "プレミア",
    `正常 ${coverage.tiers.premier.ok} / 未対応 ${coverage.tiers.premier.missing}`,
  );
  line(
    "プリンス",
    `正常 ${coverage.tiers.prince.ok} / 未対応 ${coverage.tiers.prince.missing}`,
  );
  line(
    "データ量",
    `チーム ${coverage.totals.teams} / 試合 ${coverage.totals.matches} / 順位行 ${coverage.totals.standings} / リーグ ${coverage.totals.competitions}`,
  );

  console.log("\n== 地域別 ==");
  for (const region of coverage.regions) {
    line(
      region.regionName,
      `正常 ${region.ok} / 一部 ${region.partial} / 未対応 ${region.missing} / 失敗 ${region.failed}`,
    );
  }

  const failed = health.filter(
    (source) => source.healthStatus === "FAILED" || source.status === "ERROR",
  );

  console.log("\n== 失敗している情報元 ==");
  if (failed.length === 0) {
    console.log("なし");
  } else {
    for (const source of failed) {
      console.log(
        `${source.sourceId.padEnd(24)} ${source.prefectureName ?? source.name} :: ${source.lastError ?? ""}`,
      );
    }
  }

  console.log("\n== 更新が古い情報元 ==");
  if (stale.length === 0) {
    console.log("なし");
  } else {
    for (const source of stale) {
      console.log(
        `${source.sourceId.padEnd(24)} 最終成功 ${formatDateTime(source.lastSuccessAt)}`,
      );
    }
  }

  if (process.argv.includes("--strict") && failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
