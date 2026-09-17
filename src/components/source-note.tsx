import { formatDateTime } from "./empty-state";

export interface SourceNoteProps {
  sourceName?: string | null;
  sourceUrl?: string | null;
  fetchedAt?: Date | string | null;
  parserVersion?: string | null;
  status?: string | null;
}

/**
 * Provenance footer. The product promise is that any number on screen can be
 * traced back to the body that published it, so this appears under every data
 * list rather than on a separate screen.
 */
export function SourceNote({
  sourceName,
  sourceUrl,
  fetchedAt,
  parserVersion,
  status,
}: SourceNoteProps) {
  if (!sourceName && !sourceUrl && !fetchedAt) {
    return (
      <p className="px-4 py-4 text-[12px] text-muted">
        出典情報が登録されていません。
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-line px-4 py-3 text-[12px] text-muted">
      <p>
        出典：{" "}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline decoration-accent/40 underline-offset-2"
          >
            {sourceName ?? sourceUrl}
          </a>
        ) : (
          <span>{sourceName}</span>
        )}
      </p>
      <p className="mt-1">
        最終取得 {formatDateTime(fetchedAt ?? null)}
        {parserVersion ? ` ・ parser ${parserVersion}` : ""}
        {status ? ` ・ 状態 ${status}` : ""}
      </p>
    </div>
  );
}
