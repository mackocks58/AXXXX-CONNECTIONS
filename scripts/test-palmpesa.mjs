import "dotenv/config";

// ─── CONFIG (pulled from .env) ───────────────────────────────────────────────
const API_KEY   = process.env.PALMPESA_API_KEY;
const USER_ID   = process.env.PALMPESA_USER_ID;
const VENDOR    = process.env.PALMPESA_VENDOR;

// ── CHANGE THESE FOR YOUR TEST ────────────────────────────────────────────────
const TEST_PHONE = "0712345678";   // replace with a REAL phone number you own
const TEST_NAME  = "Test User";
const TEST_EMAIL = "test@example.com";
const TEST_AMOUNT = 100;           // TZS
// ─────────────────────────────────────────────────────────────────────────────

function formatPhone(raw) {
  let p = raw.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0"))       return "255" + p.substring(1);
  if (!p.startsWith("255") && p.length === 9) return "255" + p;
  return p;
}

const URL_INIT   = "https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate";
const URL_STATUS = "https://palmpesa.drmlelwa.co.tz/api/order-status";

console.log("\n=== PalmPesa Diagnostic Test ===\n");
console.log("API_KEY  :", API_KEY  ? API_KEY.slice(0,8) + "..." : "⛔ MISSING");
console.log("USER_ID  :", USER_ID  || "⛔ MISSING");
console.log("VENDOR   :", VENDOR   || "⛔ MISSING");
console.log();

if (!API_KEY || !USER_ID) {
  console.error("❌ PALMPESA_API_KEY and PALMPESA_USER_ID must be set in .env");
  process.exit(1);
}

const orderId = `TEST${Date.now()}`;
const phone   = formatPhone(TEST_PHONE);
console.log(`Formatted phone : ${TEST_PHONE}  →  ${phone}`);
console.log(`Order ID        : ${orderId}`);
console.log(`Webhook URL     : https://xxxx-connections.vercel.app/api/palmpesa/webhook`);
console.log();

const body = {
  user_id        : USER_ID,
  vendor         : VENDOR || "",
  name           : TEST_NAME,
  email          : TEST_EMAIL,
  phone          : phone,
  amount         : TEST_AMOUNT,
  transaction_id : orderId,
  address        : "Tanzania",
  postcode       : "00000",
  callback_url   : "https://xxxx-connections.vercel.app/api/palmpesa/webhook",
};

console.log("─── Request Body ────────────────────────────────────────────────");
console.log(JSON.stringify(body, null, 2));
console.log("─────────────────────────────────────────────────────────────────\n");

try {
  const res = await fetch(URL_INIT, {
    method  : "POST",
    headers : {
      "Content-Type"  : "application/json",
      "Accept"        : "application/json",
      "Authorization" : `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  console.log(`HTTP Status : ${res.status} ${res.statusText}`);
  console.log("\n─── Raw Response ────────────────────────────────────────────────");
  console.log(raw);
  console.log("─────────────────────────────────────────────────────────────────\n");

  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }

  if (parsed) {
    console.log("─── Parsed Response ─────────────────────────────────────────────");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("─────────────────────────────────────────────────────────────────\n");

    // Check success
    const success = !!parsed?.order_id || parsed?.message?.toLowerCase().includes("initiat");
    if (success) {
      console.log("✅ Initiation looks SUCCESSFUL!");
      console.log("   PalmPesa order_id :", parsed.order_id);
      console.log("   The USSD should have been pushed to", phone);

      // Poll status
      const ppOrderId = parsed.order_id;
      if (ppOrderId) {
        console.log("\n⏳ Polling status in 5 seconds ...\n");
        await new Promise(r => setTimeout(r, 5000));
        const sRes  = await fetch(URL_STATUS, {
          method  : "POST",
          headers : { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${API_KEY}` },
          body    : JSON.stringify({ order_id: ppOrderId }),
        });
        const sRaw = await sRes.text();
        console.log("Status response:", sRaw);
      }
    } else {
      console.log("❌ Initiation FAILED. Check the response above for the error message.");
    }
  }
} catch (err) {
  console.error("❌ Network / fetch error:", err.message);
}
