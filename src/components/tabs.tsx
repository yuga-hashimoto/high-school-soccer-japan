import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  count?: number;
}

export function Tabs({
  items,
  active,
  ariaLabel,
}: {
  items: TabItem[];
  active: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 border-b border-line bg-white px-2"
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={selected}
            scroll={false}
            className={`relative flex-1 px-2 py-3 text-center text-sm ${
              selected
                ? "font-semibold text-accent"
                : "text-muted hover:text-ink-soft"
            }`}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="ml-1 text-[11px] text-muted">{item.count}</span>
            ) : null}
            {selected ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-accent" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Segmented control used inside a single screen (e.g. 順位/日程/得点). */
export function SegmentedTabs({
  items,
  active,
  ariaLabel,
}: {
  items: TabItem[];
  active: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mx-4 mt-3 flex rounded-lg bg-accent-soft p-1"
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={selected}
            scroll={false}
            className={`flex-1 rounded-md py-2 text-center text-sm ${
              selected
                ? "bg-white font-semibold text-accent shadow-sm"
                : "text-ink-soft"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
