/**
 * CLOUDFLARE WORKER & STATIC ASSETS HANDLER
 * New Year 2027 Family Portal (naiper-dev)
 * Quiet Luxury UI Suite (Gilded Ivory & Warm Obsidian)
 */
import { onRequestGet, onRequestPost, onRequestOptions } from "./functions/api/sync.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Routes for Database Sync
    if (url.pathname === "/api/sync" || url.pathname === "/api/sync/") {
      const context = {
        request,
        env,
        waitUntil: (promise) => {
          if (ctx && typeof ctx.waitUntil === "function") {
            ctx.waitUntil(promise);
          }
        }
      };

      if (request.method === "OPTIONS") {
        return onRequestOptions(context);
      } else if (request.method === "GET") {
        return onRequestGet(context);
      } else if (request.method === "POST") {
        return onRequestPost(context);
      }
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Health / Ping route
    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true, status: "healthy", timestamp: Date.now() }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Static Assets fallback with strict revalidation (prevents stale edge/browser caching)
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      const assetResponse = await env.ASSETS.fetch(request);
      const newHeaders = new Headers(assetResponse.headers);
      // Guarantee edge and browser cache revalidation
      newHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
      newHeaders.set("CDN-Cache-Control", "public, max-age=0, must-revalidate");
      newHeaders.set("Surrogate-Control", "no-store");
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: newHeaders
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
