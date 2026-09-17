"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  EMPTY_FAVORITES,
  EMPTY_HISTORY,
  favoritesStore,
  type FavoritesState,
  type HistoryEntry,
} from "./favorites-store";

interface FavoritesContextValue {
  ready: boolean;
  favorites: FavoritesState;
  history: HistoryEntry[];
  isFavoriteTeam: (teamId: string) => boolean;
  isFavoriteCompetition: (competitionId: string) => boolean;
  toggleTeam: (teamId: string) => void;
  toggleCompetition: (competitionId: string) => void;
  recordCompetitionView: (slug: string) => void;
  clearHistory: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const serverFavorites = () => EMPTY_FAVORITES;
const serverHistory = () => EMPTY_HISTORY;
const serverReady = () => false;

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getFavorites,
    serverFavorites,
  );
  const history = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getHistory,
    serverHistory,
  );
  const ready = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.isHydrated,
    serverReady,
  );

  useEffect(() => {
    favoritesStore.hydrate();
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ready,
      favorites,
      history,
      isFavoriteTeam: (teamId) => favorites.teams.includes(teamId),
      isFavoriteCompetition: (id) => favorites.competitions.includes(id),
      toggleTeam: (teamId) => favoritesStore.toggleTeam(teamId),
      toggleCompetition: (id) => favoritesStore.toggleCompetition(id),
      recordCompetitionView: (slug) => favoritesStore.recordCompetitionView(slug),
      clearHistory: () => favoritesStore.clearHistory(),
    }),
    [ready, favorites, history],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }
  return context;
}
