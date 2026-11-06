import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {"/api/recetarios/*":["./assets/recetarios/*.pdf"]},
};

export default nextConfig;
