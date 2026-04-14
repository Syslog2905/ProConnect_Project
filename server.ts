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
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = admin.firestore();

// Initialize Lemon Squeezy
lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY || "",
  onError: (error) => console.error("Lemon Squeezy Error:", error),
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
      // In v4.x, we can try to fetch the store
      const { data, error } = await createCheckout(Number(storeId), "0", {
        checkoutData: { email: "test@example.com" }
      }).catch(err => ({ error: err }));

      // If it's unauthorized, the error will tell us
      if (error && error.message.includes("Unauthorized")) {
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
      console.log(`Attempting checkout with ${isTestKey ? 'TEST' : 'LIVE'} key:`, { storeId, variantId, keySnippet: apiKey.slice(0, 8) + "..." });
      
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
