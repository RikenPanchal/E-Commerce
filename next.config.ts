import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The proxy (src/proxy.ts) buffers the whole request body for routes it
    // matches - including /api/admin/products, which accepts multi-image +
    // video uploads. Past this limit Next.js silently truncates the body
    // instead of erroring, so it must cover our largest expected upload.
    proxyClientMaxBodySize: "150mb",
  },
};

export default nextConfig;
