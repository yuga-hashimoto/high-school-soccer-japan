"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { List, ListItem, ListLink, RowBody, RowValue } from "@/components/list";
import { SectionTitle } from "@/components/page-header";
import { useFavorites } from "./favorites-context";
import type { SummaryResponse } from "./types";

const EMPTY: SummaryResponse = { teams: [], competitions: [] };

function useSummary(
  teamIds: string[],
  competitionIds: string[],
  competitionSlugs: string[],
) {
  const [data, setData] = useState<SummaryResponse>(EMPTY);
  const key = `${teamIds.join(",")}|${competitionIds.join(",")}|${competitionSlugs.join(",")}`;
  const disabled =
    teamIds.length === 0 && competitionIds.length === 0 && competitionSlugs.length === 0;

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    fetch("/api/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamIds, competitionIds, competitionSlugs }),
    })
      .then((response) => (response.ok ? response.json() : EMPTY))
      .then((json: SummaryResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, disabled]);

  return disabled ? EMPTY : data;
}

function formatKickoff(value: string | null): string {
  if (!value) return "日程未定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日程未定";
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${String(
    jst.getUTCHours(),
  ).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
}

/** Home: up to three favourite teams, with league, position and next match. */
export function FavoritesHomeSection() {
  const { ready, favorites } = useFavorites();
  const teamIds = useMemo(() => favorites.teams.slice(0, 3), [favorites.teams]);
  const data = useSummary(teamIds, [], []);

  return (
    <>
      <SectionTitle
        action={
          <Link href="/favorites" className="text-[12px] text-accent">
            すべて
          </Link>
        }
      >
        お気に入りチーム
      </SectionTitle>
      {teamIds.length === 0 ? (
        <p className="px-4 pb-1 text-[13px] text-muted">
          チーム画面の☆からお気に入りに追加できます。
        </p>
      ) : !ready || data.teams.length === 0 ? (
        <p className="px-4 pb-1 text-[13px] text-muted">読み込み中…</p>
      ) : (
        <List>
          {data.teams.map((team) => (
            <ListLink key={team.id} href={`/teams/${team.id}`}>
              <RowBody
                title={team.name}
                subtitle={team.leagueName ?? "所属リーグ未登録"}
                meta={
                  team.nextMatch
                    ? `次の試合 ${formatKickoff(team.nextMatch.kickoffAt)} vs ${
                        team.nextMatch.opponentName
                      }`
                    : "次の試合は登録されていません"
                }
              />
              <RowValue className="text-ink-soft">
                {team.position ? `${team.position}位` : "-"}
              </RowValue>
            </ListLink>
          ))}
        </List>
      )}
    </>
  );
}

/** Home: leagues the user opened recently, plus favourited competitions. */
export function RecentLeaguesSection() {
  const { ready, history, favorites } = useFavorites();
  const slugs = useMemo(
    () => history.slice(0, 5).map((entry) => entry.slug),
    [history],
  );
  const { competitions } = useSummary(
    [],
    useMemo(() => favorites.competitions.slice(0, 5), [favorites.competitions]),
    slugs,
  );

  if (!ready) return null;

  const rows = dedupeCompetitions(competitions).slice(0, 5);
  if (rows.length === 0) return null;

  return (
    <>
      <SectionTitle
        action={
          <Link href="/favorites" className="text-[12px] text-accent">
            管理
          </Link>
        }
      >
        よく見るリーグ
      </SectionTitle>
      <List>
        {rows.map((competition) => (
          <ListLink key={competition.slug} href={`/competition/${competition.slug}`}>
            <RowBody title={competition.name} subtitle={competition.label} />
          </ListLink>
        ))}
      </List>
    </>
  );
}

function dedupeCompetitions(
  competitions: SummaryResponse["competitions"],
): SummaryResponse["competitions"] {
  const map = new Map<string, SummaryResponse["competitions"][number]>();
  for (const competition of competitions) {
    if (!map.has(competition.slug)) map.set(competition.slug, competition);
  }
  return [...map.values()];
}

/** Favourites screen. */
export function FavoritesPageContent() {
  const { ready, favorites, history, toggleTeam, toggleCompetition, clearHistory } =
    useFavorites();
  const data = useSummary(
    favorites.teams,
    favorites.competitions,
    useMemo(() => history.map((entry) => entry.slug), [history]),
  );

  if (!ready) {
    return <p className="px-4 py-6 text-[13px] text-muted">読み込み中…</p>;
  }

  const historyRows = dedupeCompetitions(data.competitions).filter((competition) =>
    history.some((entry) => entry.slug === competition.slug),
  );
  const favoriteRows = dedupeCompetitions(data.competitions).filter((competition) =>
    favorites.competitions.includes(competition.id),
  );

  const hasAnything =
    favorites.teams.length > 0 ||
    favorites.competitions.length > 0 ||
    history.length > 0;

  if (!hasAnything) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-[15px] text-ink-soft">
          お気に入りはまだ登録されていません。
        </p>
        <p className="mt-2 text-[12px] text-muted">
          チームやリーグ画面の☆をタップすると、ここにまとまります。
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {favorites.teams.length > 0 ? (
        <>
          <SectionTitle>チーム</SectionTitle>
          <List>
            {data.teams.map((team) => (
              <ListItem key={team.id}>
                <RowBody
                  title={
                    <Link href={`/teams/${team.id}`} className="text-accent">
                      {team.name}
                    </Link>
                  }
                  subtitle={team.leagueName ?? "所属リーグ未登録"}
                  meta={team.position ? `${team.position}位` : undefined}
                />
                <button
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className="shrink-0 px-2 py-1 text-[12px] text-muted"
                  aria-label={`${team.name}をお気に入りから外す`}
                >
                  外す
                </button>
              </ListItem>
            ))}
          </List>
        </>
      ) : null}

      {favoriteRows.length > 0 ? (
        <>
          <SectionTitle>リーグ</SectionTitle>
          <List>
            {favoriteRows.map((competition) => (
              <ListItem key={competition.id}>
                <RowBody
                  title={
                    <Link
                      href={`/competition/${competition.slug}`}
                      className="text-accent"
                    >
                      {competition.name}
                    </Link>
                  }
                  subtitle={competition.label}
                />
                <button
                  type="button"
                  onClick={() => toggleCompetition(competition.id)}
                  className="shrink-0 px-2 py-1 text-[12px] text-muted"
                  aria-label={`${competition.name}をお気に入りから外す`}
                >
                  外す
                </button>
              </ListItem>
            ))}
          </List>
        </>
      ) : null}

      {historyRows.length > 0 ? (
        <>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={clearHistory}
                className="text-[12px] text-muted"
              >
                履歴を消す
              </button>
            }
          >
            最近見たリーグ
          </SectionTitle>
          <List>
            {historyRows.map((competition) => (
              <ListLink
                key={`history-${competition.slug}`}
                href={`/competition/${competition.slug}`}
              >
                <RowBody title={competition.name} subtitle={competition.label} />
              </ListLink>
            ))}
          </List>
        </>
      ) : null}
    </div>
  );
}
