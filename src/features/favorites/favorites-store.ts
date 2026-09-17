"use client";

const FAVORITES_KEY = "hsj.favorites.v1";
const HISTORY_KEY = "hsj.history.v1";
const MAX_HISTORY = 8;

export interface FavoritesState {
  teams: string[];
  competitions: string[];
}

export interface HistoryEntry {
  slug: string;
  viewedAt: number;
}

export const EMPTY_FAVORITES: FavoritesState = { teams: [], competitions: [] };
export const EMPTY_HISTORY: HistoryEntry[] = [];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private mode; favourites are a nicety.
  }
}

/**
 * Small external store for favourites and browse history. Using
 * `useSyncExternalStore` instead of `useEffect` + `setState` keeps SSR safe
 * (the server snapshot is always empty) without hydration mismatches.
 */
class FavoritesStore {
  private favorites: FavoritesState = EMPTY_FAVORITES;
  private history: HistoryEntry[] = EMPTY_HISTORY;
  private hydrated = false;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    this.favorites = readJson<FavoritesState>(FAVORITES_KEY, EMPTY_FAVORITES);
    this.history = readJson<HistoryEntry[]>(HISTORY_KEY, EMPTY_HISTORY);
    this.emit();
  }

  getFavorites = (): FavoritesState => this.favorites;
  getHistory = (): HistoryEntry[] => this.history;
  isHydrated = (): boolean => this.hydrated;

  private persistFavorites(next: FavoritesState): void {
    this.favorites = next;
    writeJson(FAVORITES_KEY, next);
    this.emit();
  }

  toggleTeam(teamId: string): void {
    const teams = this.favorites.teams.includes(teamId)
      ? this.favorites.teams.filter((id) => id !== teamId)
      : [teamId, ...this.favorites.teams].slice(0, 20);
    this.persistFavorites({ ...this.favorites, teams });
  }

  toggleCompetition(competitionId: string): void {
    const competitions = this.favorites.competitions.includes(competitionId)
      ? this.favorites.competitions.filter((id) => id !== competitionId)
      : [competitionId, ...this.favorites.competitions].slice(0, 20);
    this.persistFavorites({ ...this.favorites, competitions });
  }

  recordCompetitionView(slug: string): void {
    const next = [
      { slug, viewedAt: Date.now() },
      ...this.history.filter((entry) => entry.slug !== slug),
    ].slice(0, MAX_HISTORY);
    const changed =
      next.length !== this.history.length ||
      next.some((entry, index) => entry.slug !== this.history[index]?.slug);
    this.history = next;
    writeJson(HISTORY_KEY, next);
    if (changed) this.emit();
  }

  clearHistory(): void {
    this.history = EMPTY_HISTORY;
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
    this.emit();
  }
}

export const favoritesStore = new FavoritesStore();
