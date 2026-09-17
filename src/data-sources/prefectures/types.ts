import type { SourceFormat, SourceStatus } from "@/domain/enums";

export interface PrefectureCompetitionConfig {
  /** Slug that matches the seeded competition tree. */
  slug: string;
  name: string;
  level: number;
  /** Slug of the parent competition, when this division is nested. */
  parentSlug?: string;
  sortOrder?: number;
}

/**
 * Declarative description of one prefecture's official U-18 league source.
 * One file per prefecture lives in this directory; the generic adapter factory
 * turns the config into a `LeagueDataSource`.
 */
export interface PrefectureSourceConfig {
  sourceId: string;
  prefectureSlug: string;
  /** Publishing body, e.g. "福岡県サッカー協会". */
  name: string;
  /** Official association / dedicated league site, never an aggregator. */
  sourceUrl: string;
  format: SourceFormat;
  status: SourceStatus;
  updateIntervalMinutes: number;
  /**
   * Adapter key. `prefecture-html` is the generic table scraper,
   * `prefecture-pdf` reads a results PDF, `needs-parser` records that the
   * source exists but has no parser yet.
   */
  adapter?: "prefecture-html" | "prefecture-pdf" | "needs-parser";
  /**
   * Endpoints per division. Only required for adapters that are implemented.
   */
  endpoints?: Array<{
    competitionSlug: string;
    standingsUrl?: string;
    matchesUrl?: string;
    /**
     * For PDF sources: when `matchesUrl` points at an HTML page instead of a
     * .pdf, this regex picks the right PDF link from that page.
     */
    pdfLinkPattern?: string;
    /**
     * Select a PDF by its anchor text instead of its URL. Needed when the
     * association uses hashed file names but labels the link ("Aリーグ結果").
     */
    pdfLinkText?: string;
    /**
     * How to pick the PDF from a page.
     * - "newest" (default): highest trailing number in the file name.
     * - "mostMatches": parse each candidate and take the one with the most
     *   result rows. Used when the association uses hashed file names.
     */
    pdfSelection?: "newest" | "mostMatches";
    /**
     * Only parse PDF lines matching this regex. Needed when one PDF contains
     * several divisions labelled on every row (e.g. 奈良 "1部 1節 ...").
     */
    lineFilter?: string;
    /**
     * The URL is a 星取表 (cross results table) rather than a list of matches.
     * Results are read from the matrix and the standings are derived from them.
     */
    matrix?: boolean;
    /**
     * PDF that contains a real standings table (not a 星取表 / result list).
     * Read with `extractPdfStandings`, optionally filtered by sectionFilter.
     */
    pdfTable?: boolean;
    /**
     * For matrix sources: only use tables whose nearest preceding heading
     * matches this regex (e.g. "県1部" on a page holding every division).
     */
    sectionFilter?: string;
    /** Pick the Nth table when a PDF holds several independent divisions. */
    sectionIndex?: number;
    /**
     * Extra request headers. Some associations (e.g. 京都) reject hotlinks and
     * require a Referer from their own site.
     */
    headers?: Record<string, string>;
    /** Table column order for the generic HTML adapter. */
    columnMap?: Record<string, number>;
  }>;
  competitions: PrefectureCompetitionConfig[];
  notes?: string | null;
  /** Whether the URL was confirmed against the live site. */
  urlVerified?: boolean;
  /** Set when the source is a PDF-only publication. */
  pdfUrl?: string;
}
