import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { List, ListLink, RowBody } from "@/components/list";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SourceNote } from "@/components/source-note";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { formatMatchDate, MatchTeamLine } from "@/features/matches/match-list";
import { getTeamDetail } from "@/repositories/teams";
import { getCompetitionSource } from "@/repositories/competitions";
import { getDb } from "@/db/client";
import { dataHealth } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toJstTimeString } from "@/repositories/matches";

export async function generateMetadata(props: PageProps<"/teams/[id]">) {
  const { id } = await props.params;
  const detail = getTeamDetail(decodeURIComponent(id), { recentLimit: 0 });
  return { title: detail?.team.name ?? "チーム" };
}

export default async function TeamPage(props: PageProps<"/teams/[id]">) {
  const { id } = await props.params;
  const detail = getTeamDetail(decodeURIComponent(id));
  if (!detail) notFound();

  const { team, club, entry, nextMatch, recentMatches, seasonRecord, siblings } = detail;

  const sourceId = entry?.sourceId ?? null;
  const source = sourceId ? getCompetitionSource(sourceId) : null;
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
  const lastUpdated = entry?.fetchedAt ?? health?.lastSuccessAt ?? null;

  return (
    <div className="pb-8">
      <PageHeader
        title={team.name}
        meta={club ? club.name : null}
        backHref="/search"
        backLabel="検索"
        action={<FavoriteButton kind="team" id={team.id} label={team.name} />}
      />

      <SectionTitle>所属リーグ</SectionTitle>
      {entry ? (
        <List>
          <ListLink href={`/competition/${entry.competitionSlug}`}>
            <RowBody
              title={entry.competitionName}
              subtitle={`${entry.year}シーズン`}
            />
            <span className="tabular shrink-0 text-[15px] text-ink-soft">
              {entry.position}位
            </span>
          </ListLink>
        </List>
      ) : (
        <p className="px-4 text-[13px] text-muted">
          所属リーグのデータを取得できていません。
        </p>
      )}

      <SectionTitle>次の試合</SectionTitle>
      {nextMatch ? (
        <List>
          <li className="px-4 py-3">
            <div className="text-[13px] text-muted">
              {nextMatch.kickoffAt
                ? `${formatMatchDate(nextMatch.kickoffAt)} ${toJstTimeString(nextMatch.kickoffAt)}`
                : "日程未定"}
            </div>
            <div className="mt-1 text-[15px]">
              {nextMatch.homeTeamId === team.id ? "vs" : "@"}{" "}
              {nextMatch.homeTeamId === team.id
                ? nextMatch.awayTeamName
                : nextMatch.homeTeamName}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {nextMatch.competitionName}
              {nextMatch.venue ? ` ・ ${nextMatch.venue}` : ""}
            </div>
          </li>
        </List>
      ) : (
        <p className="px-4 text-[13px] text-muted">
          次の試合は登録されていません。
        </p>
      )}

      <SectionTitle>最近の5試合</SectionTitle>
      {recentMatches.length > 0 ? (
        <ul className="border-y border-line">
          {recentMatches.map((match) => (
            <MatchTeamLine key={match.id} match={match} teamId={team.id} />
          ))}
        </ul>
      ) : (
        <EmptyState message="現在データを取得できません。" />
      )}

      <SectionTitle>今季成績</SectionTitle>
      {seasonRecord ? (
        <dl className="mx-4 grid grid-cols-4 gap-y-3 rounded-lg border border-line py-3 text-center">
          <Stat label="試合" value={seasonRecord.played} />
          <Stat label="勝" value={seasonRecord.won} />
          <Stat label="分" value={seasonRecord.drawn} />
          <Stat label="敗" value={seasonRecord.lost} />
          <Stat label="得点" value={seasonRecord.goalsFor} />
          <Stat label="失点" value={seasonRecord.goalsAgainst} />
          <Stat
            label="得失"
            value={`${seasonRecord.goalDifference > 0 ? "+" : ""}${seasonRecord.goalDifference}`}
          />
          <Stat label="勝点" value={seasonRecord.points} />
        </dl>
      ) : (
        <p className="px-4 text-[13px] text-muted">
          今季成績を取得できていません。
        </p>
      )}

      {siblings.length > 0 ? (
        <>
          <SectionTitle>{club?.name ?? team.name}のチーム</SectionTitle>
          <List>
            {siblings.map((sibling) => (
              <ListLink key={sibling.id} href={`/teams/${sibling.id}`}>
                <RowBody
                  title={sibling.name}
                  subtitle={
                    club?.type === "CLUB" ? "クラブチーム" : "学校チーム"
                  }
                />
              </ListLink>
            ))}
          </List>
        </>
      ) : null}

      {club ? (
        <p className="px-4 pt-6">
          <Link
            href={`/search?q=${encodeURIComponent(club.name)}`}
            className="text-[13px] text-accent"
          >
            「{club.name}」で検索
          </Link>
        </p>
      ) : null}

      {source && seasonRecord ? (
        <SourceNote
          sourceName={source.name}
          sourceUrl={source.sourceUrl}
          fetchedAt={lastUpdated}
          parserVersion={health?.parserVersion ?? null}
          status={health?.status ?? source.status}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[16px] font-semibold">{value}</dd>
    </div>
  );
}
