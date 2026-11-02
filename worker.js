/**
 * CLOUDFLARE WORKER & STATIC ASSETS HANDLER
 * New Year 2027 Family Portal (naiper-dev)
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
        headers: { "Content-Type": "application/json" }
      });
    }

    // Static Assets fallback (index.html, style.css, app.js, etc.)
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
