import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { assertLegalConfigForProduction } from "./src/lib/legal/production-check";

assertLegalConfigForProduction();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withBundleAnalyzer(nextConfig);
