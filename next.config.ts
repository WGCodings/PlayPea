import { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  // Static export: `npm run build` writes a plain static site to out/,
  // served by nginx on the Pi. No Node server needed.
  output: phase === PHASE_PRODUCTION_BUILD ? "export" : undefined,
  trailingSlash: false,
  reactStrictMode: true,
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
});

export default nextConfig;
