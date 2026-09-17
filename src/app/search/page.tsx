import Link from "next/link";
import { List, ListLink, RowBody, RowValue } from "@/components/list";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SearchForm } from "@/features/search/search-form";
import { searchEverything } from "@/repositories/search";

export const metadata = { title: "検索" };

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const rawQuery = searchParams.q;
  const query = typeof rawQuery === "string" ? rawQuery : "";
  const results = query.trim().length > 0 ? searchEverything(query) : null;

  return (
    <div className="pb-8">
      <PageHeader title="検索" meta="学校・チーム・リーグ・都道府県を全国横断で検索" />
      <SearchForm initialQuery={query} />

      {!results ? (
        <p className="px-4 pt-6 text-[13px] text-muted">
          キーワードを入力してください。例：「東福岡」「プレミア」「福岡」
        </p>
      ) : null}

      {results && results.total === 0 ? (
        <p className="px-4 pt-6 text-[13px] text-muted">
          「{results.query}」に一致する情報は見つかりませんでした。
        </p>
      ) : null}

      {results && results.teams.length > 0 ? (
        <>
          <SectionTitle>チーム</SectionTitle>
          <List>
            {results.teams.map((team) => (
              <ListLink key={team.teamId} href={`/teams/${team.teamId}`}>
                <RowBody
                  title={team.teamName}
                  subtitle={team.competitionName ?? team.clubName ?? undefined}
                  meta={team.clubName ?? undefined}
                />
                {team.position ? (
                  <RowValue className="text-ink-soft">{team.position}位</RowValue>
                ) : null}
              </ListLink>
            ))}
          </List>
        </>
      ) : null}

      {results && results.clubs.length > 0 ? (
        <>
          <SectionTitle>学校・クラブ</SectionTitle>
          <List>
            {results.clubs.map((club) => (
              <ListLink
                key={club.clubId}
                href={`/search?q=${encodeURIComponent(club.clubName)}`}
              >
                <RowBody
                  title={club.clubName}
                  subtitle={club.prefectureName ?? undefined}
                />
                <RowValue className="text-[12px] text-muted">
                  {club.teamCount}チーム
                </RowValue>
              </ListLink>
            ))}
          </List>
        </>
      ) : null}

      {results && results.competitions.length > 0 ? (
        <>
          <SectionTitle>リーグ</SectionTitle>
          <List>
            {results.competitions.map((competition) => (
              <ListLink
                key={competition.competitionId}
                href={`/competition/${competition.competitionSlug}`}
              >
                <RowBody title={competition.competitionName} subtitle={competition.category} />
              </ListLink>
            ))}
          </List>
        </>
      ) : null}

      {results && results.prefectures.length > 0 ? (
        <>
          <SectionTitle>都道府県</SectionTitle>
          <List>
            {results.prefectures.map((prefecture) => (
              <ListLink
                key={prefecture.prefectureId}
                href={`/league/prefecture/${prefecture.prefectureSlug}`}
              >
                <RowBody
                  title={prefecture.prefectureName}
                  subtitle={`${prefecture.regionName}ブロック`}
                />
              </ListLink>
            ))}
          </List>
        </>
      ) : null}

      {results && results.total > 0 ? (
        <p className="px-4 pt-4 text-[12px] text-muted">
          リーグ一覧からも辿れます。
          <Link href="/league" className="ml-1 text-accent">
            リーグ画面へ
          </Link>
        </p>
      ) : null}
    </div>
  );
}
