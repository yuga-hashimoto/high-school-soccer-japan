import type { SourceFormat, SourceStatus } from "@/domain/enums";
import type {
  PrefectureCompetitionConfig,
  PrefectureSourceConfig,
} from "../types";

/**
 * Raw, hand-maintained description of one prefecture's information source.
 * Regional files under this directory export arrays of these; `catalog.ts`
 * expands them into full `PrefectureSourceConfig` objects.
 */
export interface PrefectureSourceInput {
  /** Matches `PrefectureSeed.slug`. */
  slug: string;
  /** Publishing body, e.g. "福岡県サッカー協会". */
  associationName: string;
  /** The page the league data is actually read from (not always the top page). */
  url: string;
  format?: SourceFormat;
  status?: SourceStatus;
  urlVerified?: boolean;
  notes?: string | null;
  adapter?: PrefectureSourceConfig["adapter"];
  /**
   * One entry per competition that should be fetched. When a division is split
   * into groups, add the group competitions to `extras` and point one endpoint
   * at each group so positions are not mixed together.
   */
  endpoints?: PrefectureSourceConfig["endpoints"];
  /** Competitions beyond the common 1部/2部(/3部) boilerplate. */
  extras?: PrefectureCompetitionConfig[];
}
