import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.4", "192.168.1.*,"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
