import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "unpdf", "pdfjs-dist"],
  typedRoutes: false,
};

export default nextConfig;
