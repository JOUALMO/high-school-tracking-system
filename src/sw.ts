
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// 1. App Shell / Start URL - CacheFirst (Self-Sustaining)
registerRoute(
    "/",
    new CacheFirst({
        cacheName: "start-url",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200], // Only cache valid responses (0 for opaque, 200 for OK)
            }),
            new ExpirationPlugin({
                maxEntries: 1,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
        ],
    })
);

// 2. Static Assets (JS, CSS, Images, Fonts)
registerRoute(
    /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
            new ExpirationPlugin({
                maxEntries: 4,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
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
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
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
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
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
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
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
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
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
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
        ],
    })
);

// 3. Page Navigations - CacheFirst (Self-Sustaining)
registerRoute(
    ({ request, url, sameOrigin }) => {
        return (
            request.mode === "navigate" &&
            sameOrigin &&
            !url.pathname.startsWith("/api/")
        );
    },
    new CacheFirst({
        cacheName: "pages",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 32,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
        ],
    })
);

// 4. API Routes - NetworkFirst (Fresh data preferred)
registerRoute(
    ({ url }) => url.pathname.startsWith("/api/"),
    new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 16,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
        ],
    })
);

// 5. Cross-Origin
registerRoute(
    ({ sameOrigin }) => !sameOrigin,
    new NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 32,
                maxAgeSeconds: 60 * 60, // 1 hour
            }),
        ],
    })
);
