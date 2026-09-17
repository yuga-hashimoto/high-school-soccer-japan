import type { MatchDTO, StandingDTO, TeamDTO } from "@/data-sources/types";
import { splitTeamName, teamSlug } from "@/data-sources/normalize";

/** Deterministic PRNG so seeded demo data is stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoCompetition {
  competitionSlug: string;
  teams: string[];
  seasonYear: number;
  /** ISO date of round 1. */
  startDate: string;
  roundIntervalDays: number;
  seed: number;
}

export interface DemoLeagueData {
  teams: TeamDTO[];
  standings: (StandingDTO & { teamName: string })[];
  matches: MatchDTO[];
}

function pairRounds(teams: string[]): Array<Array<[string, string]>> {
  const list = [...teams];
  if (list.length % 2 === 1) list.push("__BYE__");
  const n = list.length;
  const rounds: Array<Array<[string, string]>> = [];
  for (let round = 0; round < n - 1; round += 1) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home === "__BYE__" || away === "__BYE__") continue;
      pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() as string);
  }
  return rounds;
}

/**
 * Simulates a single round robin and derives the standings from the results,
 * so the demo table, schedule and scores are mutually consistent.
 */
export function buildDemoLeague(input: DemoCompetition): DemoLeagueData {
  const rng = mulberry32(input.seed);
  const rounds = pairRounds(input.teams);

  const stats = new Map<
    string,
    { won: number; drawn: number; lost: number; gf: number; ga: number }
  >();
  for (const team of input.teams) {
    stats.set(team, { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
  }

  const matches: MatchDTO[] = [];
  const start = new Date(`${input.startDate}T00:00:00+09:00`);

  rounds.forEach((pairs, roundIndex) => {
    const kickoffBase = new Date(
      start.getTime() + roundIndex * input.roundIntervalDays * 86400000,
    );
    pairs.forEach(([home, away], indexInRound) => {
      const homeGoals = weightedGoals(rng);
      const awayGoals = weightedGoals(rng);
      const homeStats = stats.get(home);
      const awayStats = stats.get(away);
      if (!homeStats || !awayStats) return;

      homeStats.gf += homeGoals;
      homeStats.ga += awayGoals;
      awayStats.gf += awayGoals;
      awayStats.ga += homeGoals;
      if (homeGoals > awayGoals) {
        homeStats.won += 1;
        awayStats.lost += 1;
      } else if (homeGoals < awayGoals) {
        awayStats.won += 1;
        homeStats.lost += 1;
      } else {
        homeStats.drawn += 1;
        awayStats.drawn += 1;
      }

      const kickoff = new Date(
        kickoffBase.getTime() + (indexInRound === 0 ? 10 : 13) * 3600000,
      );
      matches.push({
        slug: `${input.competitionSlug}-r${roundIndex + 1}-${indexInRound + 1}`,
        competitionSlug: input.competitionSlug,
        seasonYear: input.seasonYear,
        homeTeamSlug: teamSlug(home),
        awayTeamSlug: teamSlug(away),
        kickoffAt: kickoff,
        venue: null,
        homeScore: homeGoals,
        awayScore: awayGoals,
        status: "FINISHED",
        round: `第${roundIndex + 1}節`,
      });
    });
  });

  const table = [...input.teams].map((team) => {
    const s = stats.get(team) as {
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
    };
    return {
      team,
      played: s.won + s.drawn + s.lost,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.gf,
      goalsAgainst: s.ga,
      goalDifference: s.gf - s.ga,
      points: s.won * 3 + s.drawn,
    };
  });

  table.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team, "ja"),
  );

  const standings = table.map((row, index) => ({
    competitionSlug: input.competitionSlug,
    seasonYear: input.seasonYear,
    teamSlug: teamSlug(row.team),
    teamName: row.team,
    position: index + 1,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
  }));

  const teams: TeamDTO[] = input.teams.map((name) => {
    const { clubName, squadName } = splitTeamName(name);
    return {
      slug: teamSlug(name),
      name,
      clubSlug: null,
      clubName,
      shortName: null,
      squadName,
    };
  });

  return { teams, standings, matches };
}

function weightedGoals(rng: () => number): number {
  const roll = rng();
  if (roll < 0.18) return 0;
  if (roll < 0.45) return 1;
  if (roll < 0.72) return 2;
  if (roll < 0.88) return 3;
  if (roll < 0.96) return 4;
  return 5;
}

/** Teams are generated from real 2026 entry lists, results are simulated. */
export const DEMO_COMPETITIONS: DemoCompetition[] = [
  {
    competitionSlug: "premier-east",
    seasonYear: 2026,
    startDate: "2026-04-04",
    roundIntervalDays: 14,
    seed: 1001,
    teams: [
      "鹿島アントラーズユース",
      "流通経済大学付属柏高校",
      "FC東京U-18",
      "柏レイソルU-18",
      "青森山田高校",
      "帝京長岡高校",
      "前橋育英高校",
      "東京ヴェルディユース",
      "昌平高校",
      "川崎フロンターレU-18",
      "ベガルタ仙台ユース",
      "横浜FCユース",
    ],
  },
  {
    competitionSlug: "premier-west",
    seasonYear: 2026,
    startDate: "2026-04-04",
    roundIntervalDays: 14,
    seed: 1002,
    teams: [
      "ヴィッセル神戸U-18",
      "名古屋グランパスU-18",
      "サガン鳥栖U-18",
      "大津高校",
      "サンフレッチェ広島F.Cユース",
      "神村学園高等部",
      "アビスパ福岡U-18",
      "東山高校",
      "米子北高校",
      "ガンバ大阪ユース",
      "ジュビロ磐田U-18",
      "ファジアーノ岡山U-18",
    ],
  },
  {
    competitionSlug: "prince-kyushu-1",
    seasonYear: 2026,
    startDate: "2026-04-11",
    roundIntervalDays: 14,
    seed: 2001,
    teams: [
      "V・ファーレン長崎U-18",
      "鹿児島城西高校",
      "国見高校",
      "ロアッソ熊本U-18",
      "日章学園高校",
      "東福岡高校",
      "大津高校2nd",
      "飯塚高校",
      "FC琉球U-18",
      "東海大熊本星翔高校",
    ],
  },
  {
    competitionSlug: "fukuoka-1",
    seasonYear: 2026,
    startDate: "2026-04-04",
    roundIntervalDays: 14,
    seed: 4001,
    teams: [
      "ギラヴァンツ北九州U-18A",
      "福大若葉",
      "アビスパ福岡U-18 B",
      "東福岡B",
      "筑陽学園",
      "飯塚B",
      "東海大福岡B",
      "博多",
      "希望が丘",
      "福大大濠",
    ],
  },
  {
    competitionSlug: "fukuoka-2",
    seasonYear: 2026,
    startDate: "2026-04-04",
    roundIntervalDays: 14,
    seed: 4002,
    teams: [
      "九国大付B",
      "福岡舞鶴",
      "春日イーグルス",
      "九州",
      "福智",
      "小倉東",
      "北筑",
      "福大若葉B",
    ],
  },
  {
    competitionSlug: "fukuoka-3",
    seasonYear: 2026,
    startDate: "2026-04-04",
    roundIntervalDays: 14,
    seed: 4003,
    teams: [
      "小倉工業",
      "久留米筑水B",
      "東福岡D",
      "小倉南",
      "東海大福岡D",
      "宗像",
      "福岡第一",
      "春日イーグルスB",
    ],
  },
];
