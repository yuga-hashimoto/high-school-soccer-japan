import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { PwaRegister } from "@/components/pwa-register";
import { FavoritesProvider } from "@/features/favorites/favorites-context";
import { TrackView } from "@/features/favorites/track-view";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "高校サッカーリーグ全国",
    template: "%s | 高校サッカーリーグ全国",
  },
  description:
    "高円宮杯プレミア・プリンス・47都道府県の高校年代サッカーリーグを全国横断で確認できるサービスです。",
  applicationName: "高校サッカーリーグ全国",
  appleWebApp: {
    capable: true,
    title: "高校サッカー",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body className="bg-white text-ink">
        <FavoritesProvider>
          <TrackView />
          <PwaRegister />
          <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-line bg-white sm:border-x">
            <main className="flex-1 pb-16">{children}</main>
            <BottomNav />
          </div>
        </FavoritesProvider>
      </body>
    </html>
  );
}
