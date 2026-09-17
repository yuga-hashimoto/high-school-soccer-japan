import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MatchListByDate } from "@/features/matches/match-list";
import { getMatchDates, getMatchesByDate, toJstDateString } from "@/repositories/matches";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function labelFor(date: string): { day: string; weekday: string } {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  const [, month, day] = date.split("-");
  return {
    day: `${Number.parseInt(month, 10)}/${Number.parseInt(day, 10)}`,
    weekday: WEEKDAYS[parsed.getUTCDay()],
  };
}

export const metadata = { title: "試合" };

export default async function MatchesPage(props: PageProps<"/matches">) {
  const searchParams = await props.searchParams;
  const dates = getMatchDates(45);
  const today = toJstDateString(new Date());

  const requested = searchParams.date;
  const selected =
    typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : dates.includes(today)
        ? today
        : (dates[0] ?? today);

  const matches = dates.length > 0 ? getMatchesByDate(selected) : [];

  return (
    <div className="pb-8">
      <PageHeader
        title="試合"
        meta={dates.length > 0 ? "日付ごとの日程・結果" : "日程データ未取得"}
      />

      {dates.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2">
          {dates.map((date) => {
            const active = date === selected;
            const { day, weekday } = labelFor(date);
            return (
              <Link
                key={date}
                href={`/matches?date=${date}`}
                scroll={false}
                className={`flex w-14 shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 text-[12px] ${
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-soft"
                }`}
              >
                <span className="tabular font-medium">{day}</span>
                <span className="text-[10px] text-muted">{weekday}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      <MatchListByDate
        matches={matches}
        emptyMessage="この日の試合は登録されていません。"
      />
    </div>
  );
}
