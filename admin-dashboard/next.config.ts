import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    allowedDevOrigins: ["192.168.1.80:3000", "localhost:3000"],
  },
};

export default nextConfig;
