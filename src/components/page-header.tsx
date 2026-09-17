import Link from "next/link";

export function PageHeader({
  title,
  meta,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  meta?: string | null;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
      {backHref ? (
        <Link
          href={backHref}
          className="-ml-1 mb-1 inline-flex items-center gap-1 text-sm text-accent"
        >
          <span aria-hidden="true">‹</span>
          {backLabel ?? "戻る"}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {meta ? (
            <p className="mt-0.5 text-xs text-muted">{meta}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-6 mb-2 flex items-baseline justify-between px-4">
      <h2 className="text-[13px] font-semibold text-ink-soft">{children}</h2>
      {action}
    </div>
  );
}
