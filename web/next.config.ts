import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samostatný výstup: image obsahuje jen server a to, co skutečně používá,
  // ne celé node_modules. Rozdíl je stovky megabajtů na každém nasazení.
  output: "standalone",
  // Serverová akce bere ve výchozím stavu 1 MB. Fotka z telefonu má 3 až
  // 8 MB a API pustí 15 — tady je stejná hranice s rezervou na formulář.
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
