import { PageHeader } from "@/components/page-header";
import { FavoritesPageContent } from "@/features/favorites/favorites-widgets";

export const metadata = { title: "お気に入り" };

export default function FavoritesPage() {
  return (
    <div className="pb-8">
      <PageHeader title="お気に入り" meta="チームとリーグ" />
      <FavoritesPageContent />
    </div>
  );
}
