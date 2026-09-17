import Link from "next/link";
import { List, ListLink, RowBody, RowValue } from "@/components/list";
import type { CompetitionNode } from "@/repositories/competitions";

const CATEGORY_LABEL: Record<string, string> = {
  PREMIER: "プレミア",
  PRINCE: "プリンス",
  PREFECTURE: "都道府県",
  DISTRICT: "地区",
  OTHER: "その他",
};

const SOURCE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "データあり",
  PARTIAL: "一部あり",
  NEEDS_PARSER: "準備中",
  UNSUPPORTED: "未対応",
  ERROR: "取得失敗",
  DISABLED: "停止中",
};

export function CompetitionList({
  nodes,
  emptyMessage = "リーグが登録されていません。",
  showCategory = true,
}: {
  nodes: CompetitionNode[];
  emptyMessage?: string;
  showCategory?: boolean;
}) {
  if (nodes.length === 0) {
    return <p className="px-4 py-6 text-[13px] text-muted">{emptyMessage}</p>;
  }

  return (
    <List>
      {nodes.map((node) => (
        <ListLink key={node.id} href={`/competition/${node.slug}`}>
          <RowBody
            title={node.name}
            subtitle={showCategory ? CATEGORY_LABEL[node.category] : undefined}
          />
          <RowValue className="text-[11px] text-muted">
            {node.hasSeason ? "データあり" : "現在データを取得できません"}
          </RowValue>
        </ListLink>
      ))}
    </List>
  );
}

export function CompetitionSourceBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] ${
        status === "ACTIVE" || status === "OK"
          ? "bg-accent-soft text-accent"
          : status === "ERROR" || status === "FAILED"
            ? "bg-red-50 text-negative"
            : "bg-line text-muted"
      }`}
    >
      {SOURCE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function CompetitionBreadcrumbs({
  items,
}: {
  items: Array<{ name: string; slug: string }>;
}) {
  if (items.length <= 1) return null;
  return (
    <nav aria-label="階層" className="flex flex-wrap gap-x-1 px-4 pt-2 text-[12px] text-muted">
      {items.slice(0, -1).map((item) => (
        <span key={item.slug} className="flex items-center gap-1">
          <Link href={`/competition/${item.slug}`} className="text-accent">
            {item.name}
          </Link>
          <span aria-hidden="true">›</span>
        </span>
      ))}
    </nav>
  );
}
