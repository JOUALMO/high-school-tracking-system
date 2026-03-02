
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// ── Offline fallback ──────────────────────────────────────────────────
// When a navigation request fails (uncached page while offline), serve
// the cached root page so the SPA can still boot.
const FALLBACK_HTML_URL = "/";

// ── 1. App Shell / Start URL ──────────────────────────────────────────
registerRoute(
    "/",
    new CacheFirst({
        cacheName: "start-url",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 1,
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    })
);

// ── 2. Static Assets ──────────────────────────────────────────────────

registerRoute(
    /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 4,
                maxAgeSeconds: 365 * 24 * 60 * 60,
            }),
        ],
    })
);

registerRoute(
    /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 4,
                maxAgeSeconds: 7 * 24 * 60 * 60,
            }),
        ],
    })
);

registerRoute(
    /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    new StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 4,
                maxAgeSeconds: 7 * 24 * 60 * 60,
            }),
        ],
    })
);

registerRoute(
    /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    new StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 64,
                maxAgeSeconds: 30 * 24 * 60 * 60,
            }),
        ],
    })
);

registerRoute(
    /\/_next\/static.+\.js$/i,
    new CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 64,
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    })
);

registerRoute(
    /\/_next\/image\?url=.+$/i,
    new StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 64,
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    })
);

// ── 3. Page Navigations ───────────────────────────────────────────────
// Use StaleWhileRevalidate so pages always load from cache first and
// update in the background. On true cache misses while offline, fall
// back to the cached root page so the SPA shell still boots.
registerRoute(
    ({ request, url, sameOrigin }) => {
        return (
            request.mode === "navigate" &&
            sameOrigin &&
            !url.pathname.startsWith("/api/")
        );
    },
    new StaleWhileRevalidate({
        cacheName: "pages",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 32,
                maxAgeSeconds: 24 * 60 * 60,
            }),
            {
                // If the page isn't cached and we're offline, serve the root shell
                handlerDidError: async () => {
                    const cache = await caches.open("start-url");
                    const fallback = await cache.match(FALLBACK_HTML_URL);
                    return fallback || Response.error();
                },
            },
        ],
    })
);

// ── 4. API Routes ─────────────────────────────────────────────────────
// Backup POST route uses Background Sync so failed backups are retried
// automatically once the device regains connectivity.
const bgSyncPlugin = new BackgroundSyncPlugin("backup-queue", {
    maxRetentionTime: 24 * 60, // retry for up to 24 hours (in minutes)
});

registerRoute(
    ({ url }) => url.pathname.startsWith("/api/backups/"),
    new NetworkFirst({
        cacheName: "api-backups",
        networkTimeoutSeconds: 10,
        plugins: [
            bgSyncPlugin,
            new ExpirationPlugin({
                maxEntries: 16,
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    }),
    "POST"
);

// Other API routes — NetworkFirst for fresh data
registerRoute(
    ({ url }) => url.pathname.startsWith("/api/"),
    new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 16,
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    })
);

// ── 5. Cross-Origin ───────────────────────────────────────────────────
registerRoute(
    ({ sameOrigin }) => !sameOrigin,
    new NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 32,
                maxAgeSeconds: 60 * 60,
            }),
        ],
    })
);
