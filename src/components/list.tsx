import Link from "next/link";

export function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="divide-y divide-line border-y border-line">{children}</ul>
  );
}

export function ListItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${className}`}>
      {children}
    </li>
  );
}

export function ListLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 active:bg-accent-soft ${className}`}
      >
        {children}
      </Link>
    </li>
  );
}

export function RowBody({
  title,
  subtitle,
  meta,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-[15px] font-medium text-ink">{title}</div>
      {subtitle ? (
        <div className="mt-0.5 truncate text-[13px] text-ink-soft">
          {subtitle}
        </div>
      ) : null}
      {meta ? (
        <div className="mt-0.5 truncate text-[12px] text-muted">{meta}</div>
      ) : null}
    </div>
  );
}

export function RowValue({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`tabular shrink-0 text-right text-[15px] ${className}`}>
      {children}
    </div>
  );
}

export function Chevron() {
  return (
    <span aria-hidden="true" className="shrink-0 text-line-strong">
      ›
    </span>
  );
}
