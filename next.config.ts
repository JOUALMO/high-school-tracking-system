import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheStartUrl: false,
  skipWaiting: true, // Forces the SW to update immediately
  swcMinify: true,
  disable: false,
  swSrc: "src/sw.ts", // Use our custom service worker
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withPWA(nextConfig);
