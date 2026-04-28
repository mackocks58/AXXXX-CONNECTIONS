import "dotenv/config";
import express from "express";
import cors from "cors";
import { getAdmin } from "./firebaseAdmin.js";
import { createPalmpesaOrder, extractPalmpesaUrl, isPalmpesaSuccess, checkPalmpesaStatus } from "./palmpesa.js";
import crypto from "crypto";

const PORT = Number(process.env.PORT || 8787);
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("JSON Parsing Error:", err.message);
    return res.status(400).send("Invalid JSON payload");
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

function generateOrderId() {
  const prefix = (process.env.SELCOM_ORDER_PREFIX || "BS").toUpperCase();
  return `${prefix}${Date.now()}${crypto.randomInt(1000, 9999)}`;
}

function paymentSuccess(payload) {
  if (!payload) return false;

  // Extract payment status directly from payload or payload.data[0]
  let pStatus = payload.payment_status || payload.status || payload.state || payload.payment_state;
  if (payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
    pStatus = pStatus || payload.data[0].payment_status || payload.data[0].status;
  }

  pStatus = String(pStatus || "").toUpperCase();

  // If a definitive payment status exists, we MUST evaluate based on it alone.
  // We cannot use API response "resultcode: 000" because that just means the API call succeeded.
  if (pStatus) {
    if (["COMPLETED", "SUCCESS", "PAID", "DONE"].includes(pStatus)) {
      return true;
    }
    // If it's PENDING, FAILED, EXPIRED, etc., the payment is NOT successful yet.
    return false;
  }

  // Fallback for unexpected payloads: check if result/resultcode indicates success
  // This is risky but kept as an absolute last resort if payment_status is completely missing.
  const result = String(payload.result || payload.result_message || payload.message || "").toUpperCase();
  const code = String(payload.resultcode || payload.res_code || payload.code || "").toUpperCase();

  const successValues = ["COMPLETED", "SUCCESS", "PAID", "DONE", "OK", "000", "00", "0"];
  
  return (
    successValues.includes(result) ||
    successValues.includes(code) ||
    result.includes("SUCCESS") ||
    result.includes("COMPLETED")
  );
}

app.post("/api/checkout/init", async (req, res) => {
  let currentStep = "Initializing";
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Server timed out at step: ${currentStep}`)), 15000)
  );

  try {
    await Promise.race([
      timeoutPromise,
      (async () => {
        currentStep = "Getting Firebase Admin";
        const admin = getAdmin();
        const { idToken, betslipId, movieGroupId, buyer } = req.body || {};
        
        if (!idToken || (!betslipId && !movieGroupId) || !buyer?.name || !buyer?.email || !buyer?.phone) {
          return res.status(400).json({ error: "Missing idToken, betslipId/movieGroupId, or buyer details." });
        }

        const nameParts = String(buyer.name).trim().split(/\s+/);
        if (nameParts.length < 2) {
          return res.status(400).json({ error: "Full name must include at least two words." });
        }

        currentStep = "Verifying ID Token";
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        currentStep = "Connecting to Firebase Database";
        const db = admin.database();
        let cost = 0;
        let currency = "TZS";
        let title = "";

        if (betslipId) {
          currentStep = `Fetching Betslip ${betslipId}`;
          const slipSnap = await db.ref(`betslips/${betslipId}`).get();
          if (!slipSnap.exists()) return res.status(404).json({ error: "Betslip not found." });
          const slip = slipSnap.val();
          if (Number(slip.expiresAt) <= Date.now()) return res.status(400).json({ error: "This betslip has expired." });
          
          currentStep = `Checking existing betslip purchase`;
          const pSnap = await db.ref(`purchases/${uid}/${betslipId}`).get();
          if (pSnap.exists() && pSnap.val()?.status === "completed") return res.status(400).json({ error: "Already purchased." });
          
          cost = Number(slip.cost);
          currency = slip.currency || "TZS";
          title = slip.title;
        } else if (movieGroupId) {
          currentStep = `Fetching Movie Group ${movieGroupId}`;
          const groupSnap = await db.ref(`movieGroups/${movieGroupId}`).get();
          if (!groupSnap.exists()) return res.status(404).json({ error: "Movie Group not found." });
          const group = groupSnap.val();
          
          currentStep = `Checking existing movie purchase`;
          const pSnap = await db.ref(`purchases/${uid}/movieGroups/${movieGroupId}`).get();
          if (pSnap.exists() && pSnap.val()?.status === "completed") return res.status(400).json({ error: "Already purchased." });

          cost = Number(group.amount);
          currency = group.currency || "TZS";
          title = group.name;
        }

        currentStep = "Checking PalmPesa Config";
        const apiKey = process.env.PALMPESA_API_KEY;
        const userId = process.env.PALMPESA_USER_ID;
        const vendor = process.env.PALMPESA_VENDOR;
        if (!apiKey || !userId) return res.status(500).json({ error: "PalmPesa is not configured." });

        const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
        const dynamicBase = `${reqProtocol}://${reqHost}`;
        const webhookBase = process.env.SELCOM_WEBHOOK_PUBLIC_URL || process.env.VITE_API_BASE_URL || dynamicBase || process.env.PUBLIC_APP_URL;
        const webhookUrl = `${webhookBase.replace(/\/$/, "")}/api/palmpesa/webhook`;

        const orderId = generateOrderId();
        const session = {
          uid,
          betslipId: betslipId || null,
          movieGroupId: movieGroupId || null,
          amount: cost,
          currency,
          status: "pending",
          createdAt: Date.now(),
          orderId,
          title
        };

        currentStep = "Saving pending session to Firebase";
        await db.ref(`checkoutSessions/${orderId}`).set(session);
        await db.ref(`userPayments/${uid}/${orderId}`).update(session);

        currentStep = "Calling PalmPesa API";
        let palmpesaResp;
        try {
          const { createPalmpesaOrder } = await import("./palmpesa.js");
          palmpesaResp = await createPalmpesaOrder({
            apiKey, userId, vendor, orderId,
            buyerEmail: String(buyer.email).trim(),
            buyerName: String(buyer.name).trim(),
            buyerPhone: String(buyer.phone).trim(),
            amount: cost,
            webhookUrl,
          });

          console.log("PalmPesa response for", orderId, ":", JSON.stringify(palmpesaResp));

          currentStep = "Checking PalmPesa success";
          if (!isPalmpesaSuccess(palmpesaResp)) {
            console.error("PalmPesa initiation failed:", palmpesaResp);
            currentStep = "Saving failed PalmPesa state to Firebase";
            await db.ref(`checkoutSessions/${orderId}`).update({ 
              status: "palmpesa_error", 
              palmpesa: palmpesaResp,
              updatedAt: Date.now()
            });
            await db.ref(`userPayments/${uid}/${orderId}`).update({ status: "failed", updatedAt: Date.now() });
            return res.status(400).json({ 
              error: "Failed to initiate payment with PalmPesa", 
              details: palmpesaResp?.message || palmpesaResp?.error || "Unknown error"
            });
          }

          currentStep = "Saving successful PalmPesa state to Firebase";
          await db.ref(`checkoutSessions/${orderId}`).update({
            status: "awaiting_payment",
            palmpesaReference: palmpesaResp?.order_id ?? null,
            updatedAt: Date.now()
          });

          if (palmpesaResp?.order_id) {
            await db.ref(`checkoutSessions/${palmpesaResp.order_id}`).set({
              aliasFor: orderId, 
              uid, 
              betslipId: betslipId || null, 
              movieGroupId: movieGroupId || null, 
              amount: cost, 
              currency,
              createdAt: Date.now()
            });
          }

          currentStep = "Responding to client";
          return res.json({ 
            orderId, 
            palmpesaOrderId: palmpesaResp?.order_id,
            message: "Payment initiated. Please check your phone for the USSD prompt." 
          });

        } catch (bgErr) {
          console.error("PalmPesa error for", orderId, ":", bgErr?.message);
          currentStep = "Saving PalmPesa background error to Firebase";
          await db.ref(`checkoutSessions/${orderId}`).update({ 
            status: "palmpesa_error", 
            error: bgErr?.message,
            updatedAt: Date.now() 
          }).catch(() => {});
          return res.status(500).json({ error: "PalmPesa service error: " + bgErr.message });
        }
      })()
    ]);
  } catch (e) {
    console.error(`Checkout Route Error [Step: ${currentStep}]:`, e);
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message || "Server error" });
    }
  }
});


app.get("/api/checkout/status/:orderId", async (req, res) => {
  try {
    const admin = getAdmin();
    const db = admin.database();
    const actualOrderId = req.params.orderId;
    
    let sessionSnap = await db.ref(`checkoutSessions/${actualOrderId}`).get();
    if (!sessionSnap.exists()) {
      return res.status(404).json({ error: "Session not found" });
    }
    let session = sessionSnap.val();

    // If it's already resolved, just return
    if (session.status === "completed" || session.status === "failed") {
      return res.json({ status: session.status, message: "Status is already " + session.status });
    }

    const apiKey = process.env.PALMPESA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "PalmPesa missing API key" });

    // Try to get status from PalmPesa using their order_id
    const ppOrderId = session.palmpesaReference || actualOrderId;
    const ppData = await checkPalmpesaStatus({ apiKey, orderId: ppOrderId });
    
    console.log("Polling PalmPesa Status for", actualOrderId, ppOrderId, ":", ppData);

    const ok = paymentSuccess(ppData);
    
    if (ok) {
      // It's completed! Update DB just like the webhook.
      await db.ref(`checkoutSessions/${actualOrderId}`).update({
        status: "completed",
        pollAt: Date.now(),
        raw_poll: ppData
      });

      if (session.uid) {
        await db.ref(`userPayments/${session.uid}/${actualOrderId}`).update({
          status: "completed",
          updatedAt: Date.now(),
        });

        if (session.betslipId) {
          await db.ref(`purchases/${session.uid}/${session.betslipId}`).set({
            status: "completed",
            paidAt: Date.now(),
            amount: session.amount || 0,
            orderId: actualOrderId,
          });
        } else if (session.movieGroupId) {
          await db.ref(`purchases/${session.uid}/movieGroups/${session.movieGroupId}`).set({
            status: "completed",
            paidAt: Date.now(),
            amount: session.amount || 0,
            orderId: actualOrderId,
          });
        }
      }
      return res.json({ status: "completed", message: "Payment verified successfully via polling." });
    } else {
      // Not ok yet. Could be failed or pending.
      // We don't mark as failed immediately to allow user time to pay.
      // But if resultcode indicates explicit failure, we could.
      let statusValue = String(ppData?.payment_status || ppData?.status || "").toUpperCase();
      if (ppData?.data && Array.isArray(ppData.data) && ppData.data.length > 0) {
        statusValue = String(statusValue || ppData.data[0].payment_status || ppData.data[0].status || "").toUpperCase();
      }
      
      if (statusValue === "FAILED" || statusValue === "EXPIRED" || statusValue === "CANCELLED") {
        await db.ref(`checkoutSessions/${actualOrderId}`).update({
          status: "failed",
          pollAt: Date.now(),
          raw_poll: ppData
        });
        if (session.uid) {
          await db.ref(`userPayments/${session.uid}/${actualOrderId}`).update({
            status: "failed",
            updatedAt: Date.now(),
          });
        }
        return res.json({ status: "failed", message: "Payment failed according to PalmPesa." });
      }

      return res.json({ status: "pending", message: "Payment not yet completed.", raw: ppData });
    }

  } catch (e) {
    console.error("Polling error:", e);
    res.status(500).json({ error: "Error checking status" });
  }
});

app.all("/api/palmpesa/webhook", async (req, res) => {
  try {
    const admin = getAdmin();
    // Combine req.body and req.query in case they send via GET
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("--- Webhook Received ---");
    console.log(JSON.stringify(body, null, 2));

    const db = admin.database();
    
    // Save the raw webhook to the database for debugging
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await db.ref(`webhookLogs/${logId}`).set({
      receivedAt: Date.now(),
      payload: body
    });

    let orderId = body.order_id || body.orderId || body.transaction_id || body.transactionId;
    let transid = body.transid || body.transaction_id;
    let reference = body.reference || body.ref || body.payment_reference;
    let payment_status = body.payment_status || body.status;

    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      const item = body.data[0];
      orderId = orderId || item.order_id || item.orderId || item.transaction_id || item.transactionId;
      transid = transid || item.transid || item.transaction_id;
      reference = reference || item.reference || item.ref || item.payment_reference;
      payment_status = payment_status || item.payment_status || item.status;
    }

    console.log("Resolved IDs - orderId:", orderId, "transid:", transid);

    if (!orderId && !transid) {
      console.error("Webhook error: No identifying IDs found in payload.");
      return res.status(400).send("missing ids");
    }

    const lookupKey = orderId || transid;
    let sessionSnap = await db.ref(`checkoutSessions/${lookupKey}`).get();
    
    if (!sessionSnap.exists()) {
      console.error(`Webhook error: Unknown session for key ${lookupKey}`);
      return res.status(404).send("unknown session");
    }

    let session = sessionSnap.val();
    let actualOrderId = lookupKey;

    if (session.aliasFor) {
      actualOrderId = session.aliasFor;
      console.log("Alias found. Resolving to actual orderId:", actualOrderId);
      sessionSnap = await db.ref(`checkoutSessions/${actualOrderId}`).get();
      if (!sessionSnap.exists()) {
        console.error(`Webhook error: Alias points to non-existent session ${actualOrderId}`);
        return res.status(404).send("actual session not found");
      }
      session = sessionSnap.val();
    }

    const ok = paymentSuccess(body);
    console.log("Payment Success result:", ok);

    let finalStatus = "pending";
    if (ok) {
      finalStatus = "completed";
    } else {
      const s = String(payment_status || "").toUpperCase();
      if (s === "FAILED" || s === "EXPIRED" || s === "CANCELLED") {
        finalStatus = "failed";
      }
    }

    const updatePayload = {
      status: finalStatus,
      webhookAt: Date.now(),
      reference: reference ?? null,
      payment_status: payment_status ?? null,
      transid: transid ?? null,
      raw_webhook: body
    };

    // Update checkout session
    await db.ref(`checkoutSessions/${actualOrderId}`).update(updatePayload);

    // Update user's payment record if UID is available
    if (session.uid) {
      await db.ref(`userPayments/${session.uid}/${actualOrderId}`).update({
        status: finalStatus,
        updatedAt: Date.now(),
        reference: reference ?? null,
        payment_status: payment_status ?? null,
        palmpesaTransid: transid ?? null,
      });

      // If successful, create the purchase record
      if (ok) {
        if (session.betslipId) {
          await db.ref(`purchases/${session.uid}/${session.betslipId}`).set({
            status: "completed",
            paidAt: Date.now(),
            amount: session.amount || 0,
            orderId: actualOrderId,
            reference: reference ?? null,
          });
          console.log(`Purchase completed for user ${session.uid}, betslip ${session.betslipId}`);
        } else if (session.movieGroupId) {
          await db.ref(`purchases/${session.uid}/movieGroups/${session.movieGroupId}`).set({
            status: "completed",
            paidAt: Date.now(),
            amount: session.amount || 0,
            orderId: actualOrderId,
            reference: reference ?? null,
          });
          console.log(`Purchase completed for user ${session.uid}, movie group ${session.movieGroupId}`);
        }
      }
    } else {
      console.warn("No UID found in session. Could not update userPayments or purchases.");
    }

    return res.status(200).send("ok");
  } catch (e) {
    console.error("Webhook processing error:", e);
    return res.status(500).send("error");
  }
});

// ─── DEBUG: Inspect a checkout session (remove in production) ─────────────────
app.get("/api/debug/checkout/:orderId", async (req, res) => {
  try {
    const admin = getAdmin();
    const db = admin.database();
    const snap = await db.ref(`checkoutSessions/${req.params.orderId}`).get();
    if (!snap.exists()) return res.status(404).json({ error: "Session not found" });
    return res.json(snap.val());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── DEBUG: Last 20 webhook logs ──────────────────────────────────────────────
app.get("/api/debug/webhooks", async (req, res) => {
  try {
    const admin = getAdmin();
    const db = admin.database();
    const snap = await db.ref("webhookLogs").orderByKey().limitToLast(20).get();
    return res.json(snap.exists() ? snap.val() : {});
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── DEBUG: palmpesa direct probe (POST body forwarded) ───────────────────────
app.post("/api/debug/palmpesa-probe", async (req, res) => {
  try {
    const { phone, amount } = req.body || {};
    if (!phone || !amount) return res.status(400).json({ error: "phone and amount required" });

    const apiKey  = process.env.PALMPESA_API_KEY;
    const userId  = process.env.PALMPESA_USER_ID;
    const vendor  = process.env.PALMPESA_VENDOR;
    if (!apiKey || !userId) return res.status(500).json({ error: "PalmPesa not configured" });

    const { createPalmpesaOrder, checkPalmpesaStatus } = await import("./palmpesa.js");
    const orderId = `PROBE${Date.now()}`;
    const webhookBase = process.env.SELCOM_WEBHOOK_PUBLIC_URL || process.env.VITE_API_BASE_URL || "https://xxxx-connections.vercel.app";
    const webhookUrl  = `${webhookBase.replace(/\/$/, "")}/api/palmpesa/webhook`;

    const palmpesaResp = await createPalmpesaOrder({
      apiKey, userId, vendor, orderId,
      buyerEmail: "probe@debug.com",
      buyerName:  "Probe Test",
      buyerPhone: String(phone).trim(),
      amount,
      webhookUrl,
    });

    // Poll status after 3s
    let statusResp = null;
    if (palmpesaResp?.order_id) {
      await new Promise(r => setTimeout(r, 3000));
      statusResp = await checkPalmpesaStatus({ apiKey, orderId: palmpesaResp.order_id });
    }

    return res.json({ orderId, palmpesaResp, statusResp });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── DEBUG: Inspect Firebase Configuration ─────────────────────────────────────
app.get("/api/debug/firebase-config", (req, res) => {
  try {
    const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!jsonRaw) return res.json({ error: "FIREBASE_SERVICE_ACCOUNT_JSON is empty on Vercel." });

    const certObj = JSON.parse(jsonRaw);
    const originalKey = certObj.private_key || "";
    const fixedKey = originalKey.replace(/\\n/g, '\n');

    return res.json({
      databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "MISSING",
      project_id: certObj.project_id,
      client_email: certObj.client_email,
      has_private_key: !!certObj.private_key,
      key_length: originalKey.length,
      original_newlines: (originalKey.match(/\n/g) || []).length,
      literal_backslash_n: (originalKey.match(/\\n/g) || []).length,
      fixed_newlines: (fixedKey.match(/\n/g) || []).length,
      starts_with_begin: fixedKey.startsWith("-----BEGIN PRIVATE KEY-----"),
      ends_with_end: fixedKey.trim().endsWith("-----END PRIVATE KEY-----")
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Betslips API listening on http://127.0.0.1:${PORT}`);
  });
}

export default app;

