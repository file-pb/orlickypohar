import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samostatný výstup: image obsahuje jen server a to, co skutečně používá,
  // ne celé node_modules. Rozdíl je stovky megabajtů na každém nasazení.
  output: "standalone",
};

export default nextConfig;
