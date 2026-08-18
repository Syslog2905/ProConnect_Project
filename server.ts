import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  lemonSqueezySetup,
  createCheckout,
  getAuthenticatedUser,
  getStore,
} from "@lemonsqueezy/lemonsqueezy.js";
import admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Canonical public origin of the app (https://talentfabric.eu in production).
 *
 * Every externally visible URL we hand out - Lemon Squeezy checkout redirects
 * above all - is built from this value. It must never be derived from the
 * incoming request or from a client-supplied field, otherwise a checkout
 * started from a preview/staging host would bounce the buyer back to that host
 * instead of the real site.
 */
const APP_URL = (
  process.env.APP_URL ||
  process.env.VITE_APP_URL ||
  "https://talentfabric.eu"
).replace(/\/+$/, "");

/**
 * Builds an absolute return URL on the canonical origin.
 * Only a relative path is accepted from the client; anything else (absolute
 * URL, protocol-relative "//evil.com", missing leading slash) falls back to the
 * site root so the redirect cannot be pointed off-domain.
 */
function resolveReturnUrl(returnPath?: unknown): string {
  if (typeof returnPath !== "string") return APP_URL;
  if (!returnPath.startsWith("/") || returnPath.startsWith("//")) return APP_URL;
  return APP_URL + returnPath;
}

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("Firebase config loaded successfully.");
  } else {
    console.warn("WARNING: firebase-applet-config.json not found. Falling back to environment variables.");
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    };
  }
} catch (error) {
  console.error("Error loading Firebase config:", error);
}

// Initialize Firebase Admin
if (!admin.apps.length && firebaseConfig.projectId) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized.");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}
const db = admin.apps.length ? admin.firestore() : null;

// Initialize Lemon Squeezy
const LEMON_API_KEY = process.env.LEMON_SQUEEZY_API_KEY || "";
const LEMON_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || "";

lemonSqueezySetup({
  apiKey: LEMON_API_KEY,
  onError: (error) => console.error("Lemon Squeezy Error:", error),
});

/**
 * Lemon Squeezy test mode.
 *
 * A store that has not finished Merchant-of-Record activation cannot process
 * live transactions: live keys come back 401 Unauthorized and the store itself
 * comes back 403 Forbidden. Until activation completes, development has to run
 * against a test key (prefix "ls_t_") with checkouts flagged as test mode.
 *
 * Resolution order:
 *   1. LEMON_SQUEEZY_TEST_MODE=true|false - explicit override.
 *   2. Otherwise inferred from the key prefix, so dropping in a test key is
 *      enough to switch environments.
 */
function resolveTestMode(): boolean {
  const explicit = (process.env.LEMON_SQUEEZY_TEST_MODE || "").trim().toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  return LEMON_API_KEY.startsWith("ls_t_");
}

const LEMON_TEST_MODE = resolveTestMode();

function describeKey(apiKey: string): string {
  if (!apiKey) return "missing";
  if (apiKey.startsWith("ls_t_")) return "TEST";
  if (apiKey.startsWith("ey")) return "JWT";
  return "LIVE";
}

/**
 * Maps a Lemon Squeezy API failure onto an HTTP status plus an explanation the
 * operator can act on. 401 and 403 from this API almost always mean the same
 * root cause - the store is still pending activation - so we say that outright
 * instead of leaving a bare "Unauthorized".
 */
function describeLemonError(
  error: unknown,
  statusCode?: number | null
): { status: number; message: string } {
  // The SDK builds its error as `new Error(response.statusText)` with the
  // API's error payload hung off `.cause`. statusText can be an empty string
  // over HTTP/2, so the numeric statusCode from the SDK result is the reliable
  // signal and the message is only a fallback.
  const statusText = error instanceof Error ? error.message : String(error ?? "");
  const cause = (error as any)?.cause;
  const detail =
    cause === undefined || cause === null
      ? ""
      : typeof cause === "string"
        ? cause
        : JSON.stringify(cause);
  const raw = [statusText, detail].filter(Boolean).join(" - ") || "unknown error";
  const status = Number(statusCode ?? 0);
  const keyKind = describeKey(LEMON_API_KEY);

  const isUnauthorized = status === 401 || /unauthenticated|unauthorized/i.test(raw);
  const isForbidden = status === 403 || /forbidden/i.test(raw);

  if (isUnauthorized || isForbidden) {
    return {
      status: isForbidden ? 403 : 401,
      message:
        `Lemon Squeezy rejected the request for store ${LEMON_STORE_ID || "(unset)"} ` +
        `using a ${keyKind} key (test mode: ${LEMON_TEST_MODE}). ` +
        `This is expected while the store is still pending Merchant-of-Record activation - ` +
        `live keys stay unauthorized until the store is approved. ` +
        `To keep building now, switch the dashboard to Test Mode, generate a test API key ` +
        `(it starts with "ls_t_"), set LEMON_SQUEEZY_API_KEY to it, and use the test-mode ` +
        `variant IDs. Original error: ${raw}`,
    };
  }

  if (status === 404 || /not found/i.test(raw)) {
    return {
      status: 404,
      message:
        `Lemon Squeezy returned Not Found. Check that the variant ID is the variant ` +
        `(not the product) ID, and that it belongs to store ${LEMON_STORE_ID || "(unset)"} ` +
        `in the same environment as the API key (test variants only work with test keys). ` +
        `Original error: ${raw}`,
    };
  }

  return { status: 502, message: raw || "Lemon Squeezy API error" };
}

/** Guards the diagnostics endpoints outside of local development. */
function debugAccessAllowed(req: express.Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.DEBUG_TOKEN;
  if (!expected) return false;
  const provided = req.get("x-debug-token") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function startServer() {
  console.log("Starting server initialization...");
  try {
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;

    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);
    console.log(`Public origin (APP_URL): ${APP_URL}`);
    console.log(`Lemon Squeezy: ${describeKey(LEMON_API_KEY)} key, store ${LEMON_STORE_ID || "(unset)"}, test mode ${LEMON_TEST_MODE}`);

    /**
     * Lemon Squeezy webhook.
     *
     * Registered BEFORE express.json() and with a raw body parser on purpose:
     * the HMAC is computed over the exact bytes Lemon Squeezy sent. Re-encoding
     * a parsed object with JSON.stringify produces different bytes (key order,
     * whitespace, unicode escaping), so the signature would never match and
     * every paid order would be dropped.
     */
    app.post(
      "/api/webhook/lemonsqueezy",
      express.raw({ type: "*/*" }),
      async (req, res) => {
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
        if (!secret) {
          console.error("CRITICAL: LEMON_SQUEEZY_WEBHOOK_SECRET is not set; rejecting webhook.");
          return res.status(500).send("Webhook secret not configured");
        }

        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
        const digest = crypto.createHmac("sha256", secret).update(rawBody).digest();

        let signature: Buffer;
        try {
          signature = Buffer.from(req.get("X-Signature") || "", "hex");
        } catch {
          return res.status(401).send("Invalid signature");
        }

        // timingSafeEqual throws on a length mismatch, so compare lengths first.
        if (
          signature.length !== digest.length ||
          !crypto.timingSafeEqual(digest, signature)
        ) {
          console.warn("Rejected Lemon Squeezy webhook: signature mismatch.");
          return res.status(401).send("Invalid signature");
        }

        let event: any;
        try {
          event = JSON.parse(rawBody.toString("utf8"));
        } catch (error) {
          console.error("Failed to parse webhook payload:", error);
          return res.status(400).send("Malformed payload");
        }

        const eventName = event?.meta?.event_name;
        const customData = event?.meta?.custom_data;
        const userId = customData?.user_id;

        console.log(`Received webhook event: ${eventName} for user: ${userId}`);

        if (!userId) {
          return res.status(400).send("No user ID in custom data");
        }

        try {
          if (!db) {
            return res.status(500).send("Database not initialized");
          }
          const userRef = db.collection("users").doc(userId);

          if (eventName === "order_created" || eventName === "subscription_created") {
            const variantId = String(event?.data?.attributes?.variant_id ?? "");

            // Check which product was bought
            if (variantId && variantId === process.env.VITE_LEMON_SQUEEZY_PRO_PLAN_VARIANT_ID) {
              await userRef.update({
                subscriptionTier: "pro",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else if (variantId && variantId === process.env.VITE_LEMON_SQUEEZY_FEATURED_BOOST_VARIANT_ID) {
              await userRef.update({
                isFeatured: true,
                featuredUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else if (variantId && variantId === process.env.VITE_LEMON_SQUEEZY_SINGLE_JOB_VARIANT_ID) {
              await userRef.update({
                oneTimeJobsRemaining: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              console.warn(`Webhook variant ${variantId} matched no configured product; nothing granted.`);
            }
          }

          res.status(200).send("Webhook processed");
        } catch (error) {
          console.error("Error processing webhook:", error);
          res.status(500).send("Internal server error");
        }
      }
    );

    // Middleware
    app.use(express.json());

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Debug Configuration (Sensitive info masked, gated in production)
    app.get("/api/debug-config", (req, res) => {
      if (!debugAccessAllowed(req)) {
        return res.status(404).send("Not found");
      }
      res.json({
        appUrl: APP_URL,
        hasStoreId: !!LEMON_STORE_ID,
        storeId: LEMON_STORE_ID,
        apiKeyKind: describeKey(LEMON_API_KEY),
        apiKeyPrefix: LEMON_API_KEY ? LEMON_API_KEY.slice(0, 7) + "..." : "missing",
        apiKeyLength: LEMON_API_KEY.length,
        testMode: LEMON_TEST_MODE,
        hasWebhookSecret: !!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
        variantIds: {
          pro: process.env.VITE_LEMON_SQUEEZY_PRO_PLAN_VARIANT_ID || null,
          featuredBoost: process.env.VITE_LEMON_SQUEEZY_FEATURED_BOOST_VARIANT_ID || null,
          singleJob: process.env.VITE_LEMON_SQUEEZY_SINGLE_JOB_VARIANT_ID || null,
        },
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        firebaseProjectId: firebaseConfig.projectId,
        hasDb: !!db,
      });
    });

    /**
     * Read-only connectivity probe.
     *
     * Deliberately does NOT create a throwaway checkout. It asks the API who
     * the key belongs to and whether the configured store is reachable, which
     * separates the two failure modes cleanly:
     *   - key itself rejected  -> 401 on /users/me
     *   - key fine, store not activated -> 403 on /stores/:id
     */
    app.get("/api/test-lemon-connection", async (req, res) => {
      if (!debugAccessAllowed(req)) {
        return res.status(404).send("Not found");
      }
      if (!LEMON_STORE_ID || !LEMON_API_KEY) {
        return res.status(400).json({
          error: "Missing LEMON_SQUEEZY_STORE_ID or LEMON_SQUEEZY_API_KEY in the environment.",
        });
      }

      try {
        const userResult = await getAuthenticatedUser();
        if (userResult.error) {
          const { status, message } = describeLemonError(userResult.error, userResult.statusCode);
          return res.status(status).json({ stage: "authenticate", error: message });
        }

        const storeResult = await getStore(LEMON_STORE_ID);
        if (storeResult.error) {
          const { status, message } = describeLemonError(storeResult.error, storeResult.statusCode);
          return res.status(status).json({ stage: "store", error: message });
        }

        res.json({
          status: "connected",
          keyKind: describeKey(LEMON_API_KEY),
          testMode: LEMON_TEST_MODE,
          account: (userResult.data as any)?.data?.attributes?.email ?? null,
          store: {
            id: LEMON_STORE_ID,
            name: (storeResult.data as any)?.data?.attributes?.name ?? null,
          },
        });
      } catch (error) {
        const { status, message } = describeLemonError(error);
        res.status(status).json({ error: message });
      }
    });

    // Create Lemon Squeezy Checkout
    app.post("/api/create-checkout", async (req, res) => {
      const { variantId, userId, userEmail, returnPath } = req.body ?? {};
      console.log("Checkout request received:", { variantId, userId, userEmail, returnPath });

      if (!variantId || !userId) {
        console.error("Missing fields in checkout request:", { variantId, userId });
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!LEMON_API_KEY) {
        console.error("CRITICAL: LEMON_SQUEEZY_API_KEY is missing.");
        return res.status(500).json({ error: "Server configuration error: Missing API Key" });
      }

      if (!LEMON_STORE_ID) {
        console.error("CRITICAL: LEMON_SQUEEZY_STORE_ID is missing.");
        return res.status(500).json({ error: "Server configuration error: Missing Store ID. Check your Secrets." });
      }

      // Built server-side from APP_URL so buyers always land back on the
      // canonical domain, whatever host the checkout was started from.
      const redirectUrl = resolveReturnUrl(returnPath);

      try {
        console.log(
          `Attempting checkout with ${describeKey(LEMON_API_KEY)} key (test mode: ${LEMON_TEST_MODE}):`,
          { storeId: LEMON_STORE_ID, variantId, redirectUrl }
        );

        const { data, error, statusCode } = await createCheckout(
          Number(LEMON_STORE_ID),
          Number(variantId),
          {
            checkoutData: {
              email: userEmail,
              custom: {
                user_id: userId,
              },
            },
            productOptions: {
              redirectUrl,
            },
            testMode: LEMON_TEST_MODE,
          }
        );

        if (error) {
          console.error("Lemon Squeezy API Error:", error, "status:", statusCode);
          const { status, message } = describeLemonError(error, statusCode);
          return res.status(status).json({ error: message });
        }

        const url = data?.data?.attributes?.url;
        if (!url) {
          console.error("No URL in Lemon Squeezy response:", data);
          return res.status(500).json({ error: "Failed to generate checkout URL" });
        }

        console.log("Checkout created successfully:", url);
        res.json({ url });
      } catch (error) {
        console.error("Unexpected error creating Lemon Squeezy checkout:", error);
        const { status, message } = describeLemonError(error);
        res.status(status).json({ error: message });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Setting up Vite middleware for development...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Setting up static file serving for production...");
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      } else {
        console.warn("WARNING: 'dist' directory not found. Static files will not be served.");
        app.get('*', (req, res) => {
          res.status(404).send("Application is still building or dist folder is missing.");
        });
      }
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server successfully started and listening on 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("FATAL: Server failed to start:");
    console.error(error);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error("Unhandled promise rejection during startup:");
  console.error(err);
  process.exit(1);
});
