import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();

export const regions = sqliteTable("regions", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const prefectures = sqliteTable(
  "prefectures",
  {
    id: id(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("prefectures_region_idx").on(t.regionId)],
);

/**
 * Data source registry. Every competition/season/match points back at the
 * source it came from so the UI can always render provenance.
 */
export const dataSources = sqliteTable("data_sources", {
  sourceId: text("source_id").primaryKey(),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
  regionId: text("region_id").references(() => regions.id),
  prefectureId: text("prefecture_id").references(() => prefectures.id),
  adapter: text("adapter").notNull(),
  format: text("format").notNull().default("HTML"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("NEEDS_PARSER"),
  updateIntervalMinutes: integer("update_interval_minutes")
    .notNull()
    .default(720),
  sourceUrl: text("source_url").notNull(),
  notes: text("notes"),
});

/**
 * Competition tree. `parentCompetitionId` allows arbitrary depth, so a
 * prefecture can be modelled as 1部/2部/3部, East/West blocks, A/B/C/D
 * groups, promotion/relegation pools, whatever the source actually uses.
 */
export const competitions = sqliteTable(
  "competitions",
  {
    id: id(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    parentCompetitionId: text("parent_competition_id").references(
      (): AnySQLiteColumn => competitions.id,
    ),
    regionId: text("region_id").references(() => regions.id),
    prefectureId: text("prefecture_id").references(() => prefectures.id),
    level: integer("level"),
    sortOrder: integer("sort_order").notNull().default(0),
    sourceId: text("source_id").references(() => dataSources.sourceId),
  },
  (t) => [
    index("competitions_parent_idx").on(t.parentCompetitionId),
    index("competitions_prefecture_idx").on(t.prefectureId),
    index("competitions_region_idx").on(t.regionId),
  ],
);

export const seasons = sqliteTable(
  "seasons",
  {
    id: id(),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    year: integer("year").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("IN_PROGRESS"),
    sourceId: text("source_id").references(() => dataSources.sourceId),
  },
  (t) => [
    uniqueIndex("seasons_competition_year_idx").on(t.competitionId, t.year),
  ],
);

export const clubs = sqliteTable(
  "clubs",
  {
    id: id(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    prefectureId: text("prefecture_id").references(() => prefectures.id),
    type: text("type").notNull().default("SCHOOL"),
  },
  (t) => [index("clubs_prefecture_idx").on(t.prefectureId)],
);

/** A participating squad. A club (school) can field A/B/C teams. */
export const teams = sqliteTable(
  "teams",
  {
    id: id(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    name: text("name").notNull(),
    shortName: text("short_name"),
    squadName: text("squad_name"),
  },
  (t) => [index("teams_club_idx").on(t.clubId)],
);

export const seasonTeams = sqliteTable(
  "season_teams",
  {
    id: id(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
  },
  (t) => [
    uniqueIndex("season_teams_unique_idx").on(t.seasonId, t.teamId),
    index("season_teams_team_idx").on(t.teamId),
  ],
);

export const matches = sqliteTable(
  "matches",
  {
    id: id(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => teams.id),
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => teams.id),
    kickoffAt: integer("kickoff_at", { mode: "timestamp_ms" }),
    venue: text("venue"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    status: text("status").notNull().default("SCHEDULED"),
    round: text("round"),
    sourceId: text("source_id").references(() => dataSources.sourceId),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    parserVersion: text("parser_version"),
  },
  (t) => [
    index("matches_season_idx").on(t.seasonId),
    index("matches_kickoff_idx").on(t.kickoffAt),
    index("matches_home_idx").on(t.homeTeamId),
    index("matches_away_idx").on(t.awayTeamId),
  ],
);

export const standings = sqliteTable(
  "standings",
  {
    id: id(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    position: integer("position").notNull(),
    played: integer("played").notNull().default(0),
    won: integer("won").notNull().default(0),
    drawn: integer("drawn").notNull().default(0),
    lost: integer("lost").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    goalDifference: integer("goal_difference").notNull().default(0),
    points: integer("points").notNull().default(0),
    sourceId: text("source_id").references(() => dataSources.sourceId),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    parserVersion: text("parser_version"),
  },
  (t) => [
    uniqueIndex("standings_season_team_idx").on(t.seasonId, t.teamId),
    index("standings_competition_idx").on(t.competitionId),
  ],
);

/** Latest observed health per source. Kept separate from the registry. */
export const dataHealth = sqliteTable("data_health", {
  sourceId: text("source_id")
    .primaryKey()
    .references(() => dataSources.sourceId),
  status: text("status").notNull().default("UNKNOWN"),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  teamCount: integer("team_count").notNull().default(0),
  matchCount: integer("match_count").notNull().default(0),
  competitionCount: integer("competition_count").notNull().default(0),
  parserVersion: text("parser_version"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const regionsRelations = relations(regions, ({ many }) => ({
  prefectures: many(prefectures),
}));

export const prefecturesRelations = relations(prefectures, ({ one }) => ({
  region: one(regions, {
    fields: [prefectures.regionId],
    references: [regions.id],
  }),
}));

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  parent: one(competitions, {
    fields: [competitions.parentCompetitionId],
    references: [competitions.id],
    relationName: "competition_parent",
  }),
  children: many(competitions, { relationName: "competition_parent" }),
  seasons: many(seasons),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [seasons.competitionId],
    references: [competitions.id],
  }),
  matches: many(matches),
  standings: many(standings),
  seasonTeams: many(seasonTeams),
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  prefecture: one(prefectures, {
    fields: [clubs.prefectureId],
    references: [prefectures.id],
  }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, { fields: [teams.clubId], references: [clubs.id] }),
  seasonTeams: many(seasonTeams),
}));

export const seasonTeamsRelations = relations(seasonTeams, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonTeams.seasonId],
    references: [seasons.id],
  }),
  team: one(teams, { fields: [seasonTeams.teamId], references: [teams.id] }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  season: one(seasons, {
    fields: [matches.seasonId],
    references: [seasons.id],
  }),
  competition: one(competitions, {
    fields: [matches.competitionId],
    references: [competitions.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "match_home",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "match_away",
  }),
}));

export const standingsRelations = relations(standings, ({ one }) => ({
  season: one(seasons, {
    fields: [standings.seasonId],
    references: [seasons.id],
  }),
  competition: one(competitions, {
    fields: [standings.competitionId],
    references: [competitions.id],
  }),
  team: one(teams, { fields: [standings.teamId], references: [teams.id] }),
}));
