import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";
import admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY || "",
  onError: (error) => console.error("Lemon Squeezy Error:", error),
});

async function startServer() {
  console.log("Starting server initialization...");
  try {
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;

    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);

    // Middleware
    app.use(express.json());

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Debug Configuration (Sensitive info masked)
    app.get("/api/debug-config", (req, res) => {
      const apiKey = process.env.LEMON_SQUEEZY_API_KEY || "";
      res.json({
        hasStoreId: !!process.env.LEMON_SQUEEZY_STORE_ID,
        storeId: process.env.LEMON_SQUEEZY_STORE_ID,
        apiKeyPrefix: apiKey ? apiKey.slice(0, 7) + "..." : "missing",
        apiKeyLength: apiKey.length,
        isJwt: apiKey.startsWith('ey'),
        isTestKey: apiKey.startsWith('ls_t_'),
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        firebaseProjectId: firebaseConfig.projectId,
        hasDb: !!db
      });
    });

    // Test Lemon Squeezy Connection
    app.get("/api/test-lemon-connection", async (req, res) => {
      try {
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

        if (!storeId || !apiKey) {
          return res.status(400).json({ error: "Missing Store ID or API Key in Secrets" });
        }

        console.log("Testing connection for Store ID:", storeId);
        
        // In v4.x, we try to fetch the store or create a dummy checkout to test the key
        const response = await createCheckout(Number(storeId), 0, {
          checkoutData: { email: "test@example.com" }
        }).catch(err => ({ error: err, data: null }));

        const error = (response as any).error;

        // If it's unauthorized, the error will tell us
        if (error && error.message?.includes("Unauthorized")) {
          return res.status(401).json({ 
            error: "Unauthorized", 
            details: "The API Key does not have access to this Store ID. Ensure you are using the correct key for this specific store." 
          });
        }

        res.json({ status: "Connected (API Key is valid for this account)" });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Connection test failed" });
      }
    });

    // Create Lemon Squeezy Checkout
    app.post("/api/create-checkout", async (req, res) => {
      const { variantId, userId, userEmail, returnUrl } = req.body;
      console.log("Checkout request received:", { variantId, userId, userEmail });

      if (!variantId || !userId) {
        console.error("Missing fields in checkout request:", { variantId, userId });
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID || "";
        
        if (!apiKey) {
          console.error("CRITICAL: LEMON_SQUEEZY_API_KEY is missing.");
          return res.status(500).json({ error: "Server configuration error: Missing API Key" });
        }

        if (!storeId) {
          console.error("CRITICAL: LEMON_SQUEEZY_STORE_ID is missing.");
          return res.status(500).json({ error: "Server configuration error: Missing Store ID. Check your Secrets." });
        }

        const isTestKey = apiKey.startsWith('ls_t_');
        const isJwt = apiKey.startsWith('ey');
        console.log(`Attempting checkout with ${isJwt ? 'JWT' : (isTestKey ? 'TEST' : 'LIVE')} key:`, { storeId, variantId, keySnippet: apiKey.slice(0, 8) + "..." });
        
        const { data, error } = await createCheckout(
          Number(storeId),
          Number(variantId),
          {
            checkoutData: {
              email: userEmail,
              custom: {
                user_id: userId,
              },
            },
            productOptions: {
              redirectUrl: returnUrl,
            },
          }
        );

        if (error) {
          console.error("Lemon Squeezy API Error:", error);
          if (error.message.includes("Unauthorized")) {
            const isTestKey = apiKey.startsWith('ls_t_');
            return res.status(401).json({ 
              error: `Lemon Squeezy API Key (${isTestKey ? 'TEST' : 'LIVE'}) is invalid or unauthorized for Store ID ${storeId}. ` +
                    `Ensure your Store ID is correct and your API Key matches your store's environment (Test vs Live).`
            });
          }
          if (error.message.includes("Not Found")) {
            return res.status(404).json({ error: `Variant ID ${variantId} not found. Make sure you are using the 7-digit Variant ID, not the 6-digit Product ID.` });
          }
          return res.status(500).json({ error: error.message || "Lemon Squeezy API error" });
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
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
      }
    });

    // Lemon Squeezy Webhook
    app.post("/api/webhook/lemonsqueezy", async (req, res) => {
      const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(JSON.stringify(req.body)).digest("hex"), "utf8");
      const signature = Buffer.from(req.get("X-Signature") || "", "utf8");

      if (!crypto.timingSafeEqual(digest, signature)) {
        return res.status(401).send("Invalid signature");
      }

      const event = req.body;
      const eventName = event.meta.event_name;
      const customData = event.meta.custom_data;
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
          const variantId = event.data.attributes.variant_id.toString();
          
          // Check which product was bought
          if (variantId === process.env.VITE_LEMON_SQUEEZY_PRO_PLAN_VARIANT_ID) {
            await userRef.update({
              subscriptionTier: "pro",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (variantId === process.env.VITE_LEMON_SQUEEZY_FEATURED_BOOST_VARIANT_ID) {
            await userRef.update({
              isFeatured: true,
              featuredUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (variantId === process.env.VITE_LEMON_SQUEEZY_SINGLE_JOB_VARIANT_ID) {
            await userRef.update({
              oneTimeJobsRemaining: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        res.status(200).send("Webhook processed");
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send("Internal server error");
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
