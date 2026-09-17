export function EmptyState({
  message,
  hint,
  lastUpdatedAt,
}: {
  message: string;
  hint?: string;
  lastUpdatedAt?: Date | string | null;
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[15px] text-ink-soft">{message}</p>
      {hint ? <p className="mt-2 text-[12px] text-muted">{hint}</p> : null}
      {lastUpdatedAt ? (
        <p className="mt-2 text-[12px] text-muted">
          最終更新 {formatDate(lastUpdatedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
}

export function formatDateTime(value: Date | string | null): string {
  if (!value) return "未取得";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "未取得";
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日 ${String(
    jst.getUTCHours(),
  ).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
}
