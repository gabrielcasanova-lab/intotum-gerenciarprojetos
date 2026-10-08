import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com server.js, que é o que sobe no "Setup Node.js App" do cPanel.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
