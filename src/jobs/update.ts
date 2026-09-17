import { getDb } from "@/db/client";
import { registerAllSources } from "@/data-sources";
import { resolveSourceIds, runSources, type RunSourceResult } from "@/data-sources/runner";
import { seasonYearFromEnv } from "@/lib/season";

interface CliOptions {
  selectors: string[];
  seasonYear: number;
  concurrency: number;
  dryRun: boolean;
  respectInterval: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const selectors: string[] = [];
  let seasonYear = seasonYearFromEnv();
  let concurrency = 4;
  let dryRun = false;
  let respectInterval = false;

  for (const arg of argv) {
    if (arg === "--all") selectors.push("all");
    else if (arg === "--national") selectors.push("national");
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--respect-interval") respectInterval = true;
    else if (arg.startsWith("--source=")) selectors.push(`source:${arg.slice("--source=".length)}`);
    else if (arg.startsWith("--pref=")) selectors.push(`pref:${arg.slice("--pref=".length)}`);
    else if (arg.startsWith("--year=")) seasonYear = Number.parseInt(arg.slice("--year=".length), 10);
    else if (arg.startsWith("--concurrency="))
      concurrency = Number.parseInt(arg.slice("--concurrency=".length), 10);
    else if (!arg.startsWith("-")) selectors.push(arg);
  }

  if (selectors.length === 0) selectors.push("all");
  return { selectors, seasonYear, concurrency, dryRun, respectInterval };
}

function formatRow(result: RunSourceResult): string {
  const counts = `teams=${result.teams} matches=${result.matches} standings=${result.standings}`;
  const error = result.errors.length > 0 ? ` :: ${result.errors[0]}` : "";
  return `${result.status.padEnd(12)} ${result.sourceId.padEnd(24)} ${String(
    result.durationMs,
  ).padStart(6)}ms ${counts}${error}`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  registerAllSources();

  const sourceIds = [...new Set(options.selectors.flatMap(resolveSourceIds))];

  if (options.dryRun) {
    console.log(`${sourceIds.length} source(s) selected for season ${options.seasonYear}`);
    for (const id of sourceIds) console.log(` - ${id}`);
    return;
  }

  console.log(
    `updating ${sourceIds.length} source(s), season=${options.seasonYear}, concurrency=${options.concurrency}`,
  );

  const summary = await runSources(sourceIds, {
    seasonYear: options.seasonYear,
    concurrency: options.concurrency,
    db: getDb(),
    respectInterval: options.respectInterval,
  });

  for (const result of summary.results.sort((a, b) => a.sourceId.localeCompare(b.sourceId))) {
    console.log(formatRow(result));
  }

  console.log(
    `\nOK=${summary.ok} PARTIAL=${summary.partial} NEEDS_PARSER=${summary.needsParser} FAILED=${summary.failed} SKIPPED=${summary.skipped}`,
  );

  const attempted = summary.ok + summary.partial + summary.failed;
  if (attempted > 0 && summary.ok + summary.partial === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
