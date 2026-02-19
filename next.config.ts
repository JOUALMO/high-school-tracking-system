import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";

const runtimeCaching = defaultRuntimeCaching.filter(
  (entry) => entry?.options?.cacheName !== "cross-origin",
);

const withPWA = withPWAInit({
  dest: "public",
  cacheStartUrl: false,
  disable: false,
  workboxOptions: {
    skipWaiting: true,
    disableDevLogs: true,
    runtimeCaching,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
};

export default withPWA(nextConfig);
