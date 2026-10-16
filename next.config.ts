import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com server.js, que é o que sobe no "Setup Node.js App" do cPanel.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Anexos de até 20 MB (lib/uploads.ts) passam pelas Server Actions; o padrão é 1 MB.
    serverActions: { bodySizeLimit: "21mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
