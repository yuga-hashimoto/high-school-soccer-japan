import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SourceNote } from "@/components/source-note";
import { SegmentedTabs } from "@/components/tabs";
import { CompetitionBreadcrumbs, CompetitionList } from "@/features/competitions/competition-list";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { MatchListByDate } from "@/features/matches/match-list";
import { GoalsTable, StandingsTable } from "@/features/standings/standings-table";
import {
  getBreadcrumbs,
  getCompetitionBySlug,
  getCompetitionSource,
  getLatestSeason,
  listChildren,
} from "@/repositories/competitions";
import { getMatchesForSeason, getStandingsWithTeams } from "@/repositories/matches";
import { getDb } from "@/db/client";
import { dataHealth } from "@/db/schema";
import { eq } from "drizzle-orm";

const TABS = [
  { key: "standings", label: "順位" },
  { key: "schedule", label: "日程" },
  { key: "goals", label: "得点" },
];

export async function generateMetadata(props: PageProps<"/competition/[slug]">) {
  const { slug } = await props.params;
  const competition = getCompetitionBySlug(slug);
  return { title: competition?.name ?? "リーグ" };
}

export default async function CompetitionPage(
  props: PageProps<"/competition/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const rawTab = searchParams.tab;
  const tab = typeof rawTab === "string" && TABS.some((t) => t.key === rawTab) ? rawTab : "standings";
  const rawYear = searchParams.year;
  const year =
    typeof rawYear === "string" && /^\d{4}$/.test(rawYear)
      ? Number.parseInt(rawYear, 10)
      : undefined;

  const competition = getCompetitionBySlug(slug);
  if (!competition) notFound();

  const children = listChildren(competition.id);
  const breadcrumbs = getBreadcrumbs(competition.id);
  const season = getLatestSeason(competition.id, year);
  const standings = season ? getStandingsWithTeams(season.id) : [];
  const matches = season ? getMatchesForSeason(season.id) : [];

  const sourceId = competition.sourceId ?? standings[0]?.sourceId ?? null;
  const source = getCompetitionSource(sourceId);

  const standingsAreDerived =
    standings.length > 0 && standings.every((row) => row.sourceId === null);

  const health = sourceId
    ? getDb()
        .select({
          lastSuccessAt: dataHealth.lastSuccessAt,
          status: dataHealth.status,
          parserVersion: dataHealth.parserVersion,
        })
        .from(dataHealth)
        .where(eq(dataHealth.sourceId, sourceId))
        .all()[0]
    : undefined;
  const lastUpdated =
    standings[0]?.fetchedAt ?? health?.lastSuccessAt ?? null;

  const basePath = `/competition/${competition.slug}`;
  const tabItems = TABS.map((item) => ({
    ...item,
    href: item.key === "standings" ? basePath : `${basePath}?tab=${item.key}`,
  }));

  const teamCount = standings.length;

  return (
    <div className="pb-8">
      <PageHeader
        title={competition.name}
        meta={[
          season ? `${season.year}` : "シーズン未登録",
          teamCount > 0 ? `${teamCount}チーム` : "チーム未取得",
          competition.category,
        ].join(" ・ ")}
        backHref="/league"
        backLabel="リーグ"
        action={
          <FavoriteButton
            kind="competition"
            id={competition.id}
            label={competition.name}
          />
        }
      />
      <CompetitionBreadcrumbs items={breadcrumbs} />
      <SegmentedTabs items={tabItems} active={tab} ariaLabel="表示切り替え" />

      {children.length > 0 ? (
        <section>
          <SectionTitle>
            {competition.name}の下位リーグ
          </SectionTitle>
          <CompetitionList nodes={children} showCategory={false} />
        </section>
      ) : null}

      {!season ? (
        <EmptyState
          message="現在データを取得できません。"
          hint={
            children.length > 0
              ? "下位リーグを選択してください。"
              : "情報元は登録済みです。更新ジョブの完了後に表示されます。"
          }
          lastUpdatedAt={health?.lastSuccessAt ?? null}
        />
      ) : null}

      {season && tab === "standings" ? (
        standings.length > 0 ? (
          <div className="pt-3">
            <StandingsTable rows={standings} />
            {standingsAreDerived ? (
              <p className="px-4 pt-3 text-[12px] text-muted">
                公開された順位表がないため、取得した試合結果から順位を算出しています。
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            message="現在データを取得できません。"
            hint="順位表がまだ取得できていません。"
            lastUpdatedAt={health?.lastSuccessAt ?? null}
          />
        )
      ) : null}

      {season && tab === "schedule" ? (
        <div className="pt-3">
          <MatchListByDate matches={matches} />
        </div>
      ) : null}

      {season && tab === "goals" ? (
        standings.length > 0 ? (
          <div className="pt-3">
            <GoalsTable rows={standings} />
            {standingsAreDerived ? (
              <p className="px-4 pt-3 text-[12px] text-muted">
                公開された順位表がないため、取得した試合結果から集計しています。
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState message="現在データを取得できません。" />
        )
      ) : null}

      {season && standings.length > 0 ? (
        <SourceNote
          sourceName={source?.name ?? sourceId}
          sourceUrl={source?.sourceUrl ?? null}
          fetchedAt={lastUpdated}
          parserVersion={health?.parserVersion ?? null}
          status={health?.status ?? source?.status ?? null}
        />
      ) : null}
    </div>
  );
}
