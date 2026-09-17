export interface FavoriteTeamSummary {
  id: string;
  name: string;
  clubName: string | null;
  leagueName: string | null;
  leagueSlug: string | null;
  position: number | null;
  points: number | null;
  nextMatch: {
    opponentName: string;
    kickoffAt: string | null;
    isHome: boolean;
    competitionName: string;
  } | null;
}

export interface FavoriteCompetitionSummary {
  id: string;
  name: string;
  slug: string;
  label: string;
  regionName: string | null;
  prefectureName: string | null;
}

export interface SummaryResponse {
  teams: FavoriteTeamSummary[];
  competitions: FavoriteCompetitionSummary[];
}
