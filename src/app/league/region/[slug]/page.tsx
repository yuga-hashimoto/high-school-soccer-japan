import { notFound } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { CompetitionList } from "@/features/competitions/competition-list";
import {
  getRegionBySlug,
  listCompetitionsByRegion,
} from "@/repositories/competitions";

export default async function RegionPage(props: PageProps<"/league/region/[slug]">) {
  const { slug } = await props.params;
  const region = getRegionBySlug(slug);
  if (!region) notFound();

  const competitions = listCompetitionsByRegion(region.id).filter(
    (node) => node.category === "PRINCE",
  );

  return (
    <div className="pb-8">
      <PageHeader
        title={region.name}
        meta="プリンスリーグ"
        backHref="/league?tab=region"
        backLabel="地域一覧"
      />
      <SectionTitle>リーグ</SectionTitle>
      <CompetitionList
        nodes={competitions}
        emptyMessage="この地域のリーグは現在データを取得できません。"
        showCategory={false}
      />
      <p className="px-4 pt-4 text-[12px] text-muted">
        1部・2部など階層がある場合は、リーグ画面で下位リーグも確認できます。
      </p>
    </div>
  );
}
