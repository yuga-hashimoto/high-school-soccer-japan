import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { competitions as competitionsTable } from "@/db/schema";
import { getCompetitionById } from "@/repositories/competitions";
import { getTeamDetail } from "@/repositories/teams";
import type {
  FavoriteCompetitionSummary,
  FavoriteTeamSummary,
  SummaryResponse,
} from "@/features/favorites/types";

export const dynamic = "force-dynamic";

interface RequestBody {
  teamIds?: unknown;
  competitionIds?: unknown;
  competitionSlugs?: unknown;
}

function asStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, limit);
}

export async function POST(request: Request): Promise<NextResponse<SummaryResponse>> {
  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  const teamIds = asStringArray(body.teamIds, 20);
  const competitionIds = asStringArray(body.competitionIds, 20);
  const competitionSlugs = asStringArray(body.competitionSlugs, 12);

  const teams: FavoriteTeamSummary[] = [];
  for (const teamId of teamIds) {
    const detail = getTeamDetail(teamId, { recentLimit: 0 });
    if (!detail) continue;
    const next = detail.nextMatch;
    teams.push({
      id: detail.team.id,
      name: detail.team.name,
      clubName: detail.club?.name ?? null,
      leagueName: detail.entry?.competitionName ?? null,
      leagueSlug: detail.entry?.competitionSlug ?? null,
      position: detail.entry?.position ?? null,
      points: detail.entry?.points ?? null,
      nextMatch: next
        ? {
            opponentName:
              next.homeTeamId === teamId ? next.awayTeamName : next.homeTeamName,
            kickoffAt: next.kickoffAt ? next.kickoffAt.toISOString() : null,
            isHome: next.homeTeamId === teamId,
            competitionName: next.competitionName,
          }
        : null,
    });
  }

  const competitions: FavoriteCompetitionSummary[] = [];
  const seen = new Set<string>();

  for (const competitionId of competitionIds) {
    const competition = getCompetitionById(competitionId);
    if (!competition || seen.has(competition.slug)) continue;
    seen.add(competition.slug);
    competitions.push(toSummary(competition));
  }

  if (competitionSlugs.length > 0) {
    const db = getDb();
    for (const slug of competitionSlugs) {
      if (seen.has(slug)) continue;
      const competition = db
        .select()
        .from(competitionsTable)
        .where(eq(competitionsTable.slug, slug))
        .all()[0];
      if (!competition) continue;
      seen.add(slug);
      competitions.push(toSummary(competition));
    }
  }

  return NextResponse.json({ teams, competitions });
}

function toSummary(competition: {
  id: string;
  name: string;
  slug: string;
  category: string;
}): FavoriteCompetitionSummary {
  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    label: labelForCategory(competition.category),
    regionName: null,
    prefectureName: null,
  };
}

function labelForCategory(category: string): string {
  switch (category) {
    case "PREMIER":
      return "プレミア";
    case "PRINCE":
      return "プリンス";
    case "PREFECTURE":
      return "都道府県";
    case "DISTRICT":
      return "地区";
    default:
      return "その他";
  }
}
