import Link from "next/link";
import { SectionTitle } from "@/components/page-header";
import { MatchListItem } from "@/features/matches/match-list";
import {
  FavoritesHomeSection,
  RecentLeaguesSection,
} from "@/features/favorites/favorites-widgets";
import {
  getMatchesByDate,
  getUpcomingMatches,
  toJstDateString,
  type MatchRow,
} from "@/repositories/matches";

function todayInJst(): string {
  return toJstDateString(new Date());
}

function formatTodayLabel(date: string): string {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][
    new Date(`${date}T00:00:00+09:00`).getUTCDay()
  ];
  void year;
  return `${month}月${day}日（${weekday}）`;
}

export default function HomePage() {
  const today = todayInJst();
  const todayMatches = getMatchesByDate(today);
  const upcoming = getUpcomingMatches(new Date(), 5);
  const shown: MatchRow[] = todayMatches.length > 0 ? todayMatches.slice(0, 5) : upcoming;
  const isToday = todayMatches.length > 0;

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[17px] font-semibold tracking-tight">
            高校サッカーリーグ全国
          </h1>
          <Link href="/admin/health" className="text-[11px] text-muted">
            データ状況
          </Link>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {isToday ? `${formatTodayLabel(today)}の試合` : "直近の試合"}
        </p>
      </header>

      <FavoritesHomeSection />

      <SectionTitle
        action={
          <Link href="/matches" className="text-[12px] text-accent">
            日程一覧
          </Link>
        }
      >
        {isToday ? "今日の試合" : "直近の試合"}
      </SectionTitle>
      {shown.length === 0 ? (
        <p className="px-4 pb-2 text-[13px] text-muted">
          現在データを取得できません。更新ジョブの実行後に表示されます。
        </p>
      ) : (
        <ul>
          {shown.map((match) => (
            <MatchListItem key={match.id} match={match} />
          ))}
        </ul>
      )}

      <RecentLeaguesSection />

      <section className="px-4 pt-8">
        <Link
          href="/league"
          className="block rounded-lg border border-line px-4 py-3 text-center text-[14px] text-accent"
        >
          全国のリーグを見る
        </Link>
      </section>
    </div>
  );
}
