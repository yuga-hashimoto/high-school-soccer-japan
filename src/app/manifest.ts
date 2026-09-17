import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "高校サッカーリーグ全国",
    short_name: "高校サッカー",
    description:
      "高円宮杯プレミア・プリンス・47都道府県の高校年代サッカーリーグを全国横断で確認できます。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ja",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
