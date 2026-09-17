"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function Icon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    icon: (active) => <Icon active={active} path="M3 10.5 12 3l9 7.5V21H3z" />,
  },
  {
    href: "/matches",
    label: "試合",
    icon: (active) => (
      <Icon
        active={active}
        path="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18M3 12h18"
      />
    ),
  },
  {
    href: "/league",
    label: "リーグ",
    icon: (active) => (
      <Icon active={active} path="M4 5h16M4 12h16M4 19h10" />
    ),
  },
  {
    href: "/search",
    label: "検索",
    icon: (active) => (
      <Icon active={active} path="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.5 3 4-4" />
    ),
  },
  {
    href: "/favorites",
    label: "お気に入り",
    icon: (active) => (
      <Icon
        active={active}
        path="M12 20.5 4.8 13.3a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7a4.6 4.6 0 0 1 6.5 6.5Z"
      />
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-white/95 backdrop-blur"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] leading-none ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
