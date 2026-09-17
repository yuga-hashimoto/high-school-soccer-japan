export class DataSourceError extends Error {
  readonly sourceId: string;
  readonly url: string | null;

  constructor(sourceId: string, url: string | null, message: string, cause?: unknown) {
    super(message);
    this.name = "DataSourceError";
    this.sourceId = sourceId;
    this.url = url;
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Thrown when an adapter is registered but its parser is not written yet. */
export class NeedsParserError extends DataSourceError {
  constructor(sourceId: string, url: string | null, message: string) {
    super(sourceId, url, message);
    this.name = "NeedsParserError";
  }
}

/** Thrown when the source cannot be legally or practically fetched. */
export class UnsupportedSourceError extends DataSourceError {
  constructor(sourceId: string, url: string | null, message: string) {
    super(sourceId, url, message);
    this.name = "UnsupportedSourceError";
  }
}

export class RobotsDisallowedError extends DataSourceError {
  constructor(sourceId: string, url: string) {
    super(sourceId, url, "robots.txt disallows fetching this URL");
    this.name = "RobotsDisallowedError";
  }
}

export class FetchFailedError extends DataSourceError {
  constructor(sourceId: string, url: string, status: number) {
    super(sourceId, url, `request failed with status ${status}`);
    this.name = "FetchFailedError";
  }
}

export function isExpectedSourceFailure(error: unknown): boolean {
  return (
    error instanceof NeedsParserError ||
    error instanceof UnsupportedSourceError ||
    error instanceof RobotsDisallowedError
  );
}
