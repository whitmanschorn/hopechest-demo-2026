import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo uploads POST the image through a server action; the default 1MB cap
    // would reject real photos. The action itself enforces an 8MB limit.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
