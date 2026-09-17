import Link from "next/link";
import { List, ListLink, RowBody } from "@/components/list";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { CompetitionList } from "@/features/competitions/competition-list";
import {
  getCompetitionBySlug,
  listChildren,
  listPrefectures,
  listRegions,
  listTopLevelCompetitions,
} from "@/repositories/competitions";

const TABS = [
  { key: "national", label: "全国" },
  { key: "region", label: "地域" },
  { key: "prefecture", label: "都道府県" },
];

export const metadata = { title: "リーグ" };

export default async function LeaguePage(props: PageProps<"/league">) {
  const params = await props.searchParams;
  const rawTab = params.tab;
  const tab = typeof rawTab === "string" ? rawTab : "national";

  return (
    <div className="pb-8">
      <PageHeader title="リーグ" meta="全国 → 地域 → 都道府県" />
      <Tabs
        ariaLabel="リーグ区分"
        active={tab}
        items={TABS.map((item) => ({
          ...item,
          href: item.key === "national" ? "/league" : `/league?tab=${item.key}`,
        }))}
      />

      {tab === "national" ? <NationalTab /> : null}
      {tab === "region" ? <RegionTab /> : null}
      {tab === "prefecture" ? <PrefectureTab /> : null}
    </div>
  );
}

function NationalTab() {
  const premier = getCompetitionBySlug("premier");
  const children = premier ? listChildren(premier.id) : [];
  const others = listTopLevelCompetitions().filter(
    (node) => node.slug !== "premier" && node.category === "PREMIER",
  );

  return (
    <div>
      <SectionTitle>プレミアリーグ</SectionTitle>
      <CompetitionList
        nodes={[...children, ...others]}
        emptyMessage="プレミアリーグが登録されていません。"
        showCategory={false}
      />
      <p className="px-4 pt-3 text-[12px] text-muted">
        高円宮杯 JFA U-18 サッカープレミアリーグは EAST / WEST の2ブロック制です。
      </p>
    </div>
  );
}

function RegionTab() {
  const regions = listRegions();
  return (
    <div>
      <SectionTitle>地域</SectionTitle>
      <List>
        {regions.map((region) => (
          <ListLink key={region.id} href={`/league/region/${region.slug}`}>
            <RowBody
              title={region.name}
              subtitle={`プリンスリーグ${region.name}`}
            />
          </ListLink>
        ))}
      </List>
    </div>
  );
}

function PrefectureTab() {
  const regions = listRegions();
  const prefectures = listPrefectures();

  return (
    <div>
      {regions.map((region) => {
        const items = prefectures.filter((prefecture) => prefecture.regionId === region.id);
        if (items.length === 0) return null;
        return (
          <section key={region.id}>
            <SectionTitle>{region.name}</SectionTitle>
            <List>
              {items.map((prefecture) => (
                <ListLink
                  key={prefecture.id}
                  href={`/league/prefecture/${prefecture.slug}`}
                >
                  <RowBody title={prefecture.name} />
                </ListLink>
              ))}
            </List>
          </section>
        );
      })}
      <p className="px-4 pt-4 text-[12px] text-muted">
        全47都道府県を掲載しています。データ未取得の県も一覧に表示されます。
      </p>
      <p className="px-4 pt-4 text-[12px]">
        <Link href="/league" className="text-accent">
          全国のリーグへ
        </Link>
      </p>
    </div>
  );
}
