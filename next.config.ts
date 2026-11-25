import type { NextConfig } from "next";
import { assertLegalConfigForProduction } from "./src/lib/legal/production-check";

assertLegalConfigForProduction();

const nextConfig: NextConfig = {
  /* clean config: no experimental flags or turbopack loader overrides */
};

export default nextConfig;
