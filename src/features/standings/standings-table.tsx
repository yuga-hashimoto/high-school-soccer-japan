import Link from "next/link";
import type { StandingRow } from "@/repositories/matches";

/**
 * The standings screen is deliberately three columns wide. Everything else
 * (試合数/勝/分/敗/得点/失点) lives on the team screen, which keeps the table
 * readable at 390px.
 */
export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <table className="w-full border-collapse text-[14px]">
      <caption className="sr-only">順位表</caption>
      <thead>
        <tr className="border-b border-line text-[11px] text-muted">
          <th scope="col" className="w-10 py-2 pl-4 text-left font-normal">
            順位
          </th>
          <th scope="col" className="py-2 text-left font-normal">
            チーム
          </th>
          <th scope="col" className="w-12 py-2 text-right font-normal">
            勝点
          </th>
          <th scope="col" className="w-12 py-2 pr-4 text-right font-normal">
            得失
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.teamId} className="border-b border-line last:border-b-0">
            <td className="tabular py-3 pl-4 align-middle text-[13px] text-ink-soft">
              {row.position}
            </td>
            <td className="py-3 pr-2 align-middle">
              <Link href={`/teams/${row.teamId}`} className="block truncate">
                {row.teamName}
              </Link>
            </td>
            <td className="tabular py-3 text-right align-middle font-semibold">
              {row.points}
            </td>
            <td
              className={`tabular py-3 pr-4 text-right align-middle ${
                row.goalDifference > 0
                  ? "text-positive"
                  : row.goalDifference < 0
                    ? "text-negative"
                    : "text-muted"
              }`}
            >
              {row.goalDifference > 0 ? "+" : ""}
              {row.goalDifference}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 得点 tab: goals for/against for the same season, still one screen. */
export function GoalsTable({ rows }: { rows: StandingRow[] }) {
  const sorted = [...rows].sort((a, b) => b.goalsFor - a.goalsFor);
  return (
    <table className="w-full border-collapse text-[14px]">
      <caption className="sr-only">得点・失点</caption>
      <thead>
        <tr className="border-b border-line text-[11px] text-muted">
          <th scope="col" className="py-2 pl-4 text-left font-normal">
            チーム
          </th>
          <th scope="col" className="w-12 py-2 text-right font-normal">
            得点
          </th>
          <th scope="col" className="w-12 py-2 text-right font-normal">
            失点
          </th>
          <th scope="col" className="w-14 py-2 pr-4 text-right font-normal">
            得失
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.teamId} className="border-b border-line last:border-b-0">
            <td className="py-3 pl-4 align-middle">
              <Link href={`/teams/${row.teamId}`} className="block truncate">
                {row.teamName}
              </Link>
            </td>
            <td className="tabular py-3 text-right align-middle">
              {row.goalsFor}
            </td>
            <td className="tabular py-3 text-right align-middle text-muted">
              {row.goalsAgainst}
            </td>
            <td
              className={`tabular py-3 pr-4 text-right align-middle ${
                row.goalDifference > 0
                  ? "text-positive"
                  : row.goalDifference < 0
                    ? "text-negative"
                    : "text-muted"
              }`}
            >
              {row.goalDifference > 0 ? "+" : ""}
              {row.goalDifference}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
