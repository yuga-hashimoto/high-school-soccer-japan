import Link from "next/link";
import type { MatchRow } from "@/repositories/matches";
import { toJstDateString, toJstTimeString } from "@/repositories/matches";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatMatchDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日（${
    WEEKDAYS[jst.getUTCDay()]
  }）`;
}

/** One match line: time, teams, score, and a small competition label. */
export function MatchListItem({ match }: { match: MatchRow }) {
  const kickoff = match.kickoffAt;
  const finished = match.status === "FINISHED";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  const center = finished && hasScore ? `${match.homeScore} - ${match.awayScore}` : "vs";
  const homeWon = finished && hasScore && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = finished && hasScore && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/competition/${match.competitionSlug}`} className="block px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="tabular w-11 shrink-0 text-[13px] text-ink-soft">
            {kickoff ? toJstTimeString(kickoff) : "--:--"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`min-w-0 flex-1 truncate text-[15px] ${
                  homeWon ? "font-semibold" : ""
                }`}
              >
                {match.homeTeamName}
              </span>
              <span
                className={`tabular shrink-0 text-[14px] ${
                  finished && hasScore
                    ? "font-semibold text-ink"
                    : "text-muted"
                }`}
              >
                {center}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-right text-[15px] ${
                  awayWon ? "font-semibold" : ""
                }`}
              >
                {match.awayTeamName}
              </span>
            </div>
            <div className="mt-1 truncate text-[11px] text-muted">
              {match.competitionName}
              {match.round ? ` ・ ${match.round}` : ""}
              {match.status === "POSTPONED" ? " ・ 延期" : ""}
              {match.status === "CANCELLED" ? " ・ 中止" : ""}
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Groups matches by JST date, used by the 試合 tab and team screens. */
export function MatchListByDate({
  matches,
  emptyMessage = "この日の試合は登録されていません。",
}: {
  matches: MatchRow[];
  emptyMessage?: string;
}) {
  if (matches.length === 0) {
    return <p className="px-4 py-6 text-[13px] text-muted">{emptyMessage}</p>;
  }

  const groups = new Map<string, MatchRow[]>();
  for (const match of matches) {
    const key = match.kickoffAt ? toJstDateString(match.kickoffAt) : "unknown";
    const bucket = groups.get(key) ?? [];
    bucket.push(match);
    groups.set(key, bucket);
  }

  return (
    <div>
      {[...groups.entries()].map(([date, rows]) => (
        <section key={date}>
          <h2 className="sticky top-0 z-10 border-y border-line bg-accent-soft px-4 py-1.5 text-[12px] font-medium text-ink-soft">
            {date === "unknown"
              ? "日時未定"
              : formatMatchDate(rows[0].kickoffAt ?? new Date())}
          </h2>
          <ul>
            {rows.map((match) => (
              <MatchListItem key={match.id} match={match} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function MatchTeamLine({
  match,
  teamId,
}: {
  match: MatchRow;
  teamId: string;
}) {
  const isHome = match.homeTeamId === teamId;
  const own = isHome ? match.homeScore : match.awayScore;
  const against = isHome ? match.awayScore : match.homeScore;
  const opponent = isHome ? match.awayTeamName : match.homeTeamName;
  let outcome: "win" | "draw" | "loss" | "none" = "none";
  if (own !== null && against !== null && match.status === "FINISHED") {
    outcome = own > against ? "win" : own < against ? "loss" : "draw";
  }
  const outcomeLabel =
    outcome === "win" ? "勝" : outcome === "loss" ? "敗" : outcome === "draw" ? "分" : "-";
  const outcomeClass =
    outcome === "win"
      ? "text-positive"
      : outcome === "loss"
        ? "text-negative"
        : "text-muted";

  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
      <span className="tabular w-14 shrink-0 text-[12px] text-muted">
        {match.kickoffAt
          ? `${match.kickoffAt.getTime() ? toJstDateString(match.kickoffAt).slice(5).replace("-", "/") : ""}`
          : "-"}
      </span>
      <span className={`tabular w-5 shrink-0 text-[13px] font-semibold ${outcomeClass}`}>
        {outcomeLabel}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px]">
        {isHome ? "vs" : "@"} {opponent}
      </span>
      <span className="tabular shrink-0 text-[14px] font-medium">
        {own !== null && against !== null ? `${own}-${against}` : ""}
      </span>
    </li>
  );
}
