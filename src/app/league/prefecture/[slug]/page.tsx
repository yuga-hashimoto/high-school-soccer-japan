import { notFound } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { CompetitionList } from "@/features/competitions/competition-list";
import {
  getPrefectureBySlug,
  listChildren,
  listCompetitionsByPrefecture,
} from "@/repositories/competitions";

export default async function PrefecturePage(
  props: PageProps<"/league/prefecture/[slug]">,
) {
  const { slug } = await props.params;
  const prefecture = getPrefectureBySlug(slug);
  if (!prefecture) notFound();

  const roots = listCompetitionsByPrefecture(prefecture.id);

  // A prefecture may be modelled as a parent league with divisions underneath,
  // or as a flat list of leagues. Show whichever actually exists.
  const groups = roots.map((root) => {
    const children = listChildren(root.id);
    return { root, children };
  });

  const hasAny = groups.some((group) => group.children.length > 0 || group.root);

  return (
    <div className="pb-8">
      <PageHeader
        title={`${prefecture.name}U-18リーグ`}
        meta="都道府県リーグ"
        backHref="/league?tab=prefecture"
        backLabel="都道府県一覧"
      />

      {!hasAny ? (
        <p className="px-4 py-6 text-[13px] text-muted">
          現在データを取得できません。情報元の登録は完了しています。
        </p>
      ) : null}

      {groups.map((group) =>
        group.children.length > 0 ? (
          <section key={group.root.id}>
            <SectionTitle>{group.root.name}</SectionTitle>
            <CompetitionList nodes={group.children} showCategory={false} />
          </section>
        ) : (
          <section key={group.root.id}>
            <SectionTitle>リーグ</SectionTitle>
            <CompetitionList nodes={[group.root]} showCategory={false} />
          </section>
        ),
      )}

      <p className="px-4 pt-4 text-[12px] text-muted">
        地区リーグ・グループリーグなど下位の階層も、リーグ画面から順にたどれます。
      </p>
    </div>
  );
}
