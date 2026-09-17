"use client";

import { useFavorites } from "./favorites-context";

export function FavoriteButton({
  kind,
  id,
  label,
}: {
  kind: "team" | "competition";
  id: string;
  label: string;
}) {
  const {
    ready,
    isFavoriteTeam,
    isFavoriteCompetition,
    toggleTeam,
    toggleCompetition,
  } = useFavorites();

  const active =
    kind === "team" ? isFavoriteTeam(id) : isFavoriteCompetition(id);

  return (
    <button
      type="button"
      disabled={!ready}
      aria-pressed={active}
      aria-label={active ? `${label}をお気に入りから外す` : `${label}をお気に入りに追加`}
      onClick={() => (kind === "team" ? toggleTeam(id) : toggleCompetition(id))}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line-strong text-muted"
      }`}
    >
      {active ? "★ お気に入り" : "☆ 追加"}
    </button>
  );
}
