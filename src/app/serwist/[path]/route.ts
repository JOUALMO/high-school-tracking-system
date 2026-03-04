import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Compute revision from git commit hash (or random UUID as fallback)
const revision =
    spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
    crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
    createSerwistRoute({
        additionalPrecacheEntries: [{ url: "/~offline", revision }],
        swSrc: "src/app/sw.ts",
        useNativeEsbuild: true,
    });
