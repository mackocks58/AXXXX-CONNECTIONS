import "dotenv/config";
import { getAdmin } from "../server/firebaseAdmin.js";

async function testFirebase() {
  console.log("Testing Firebase Admin...");
  try {
    const admin = getAdmin();
    const db = admin.database();
    
    console.log("Fetching webhooks...");
    const snap = await db.ref("webhookLogs").orderByKey().limitToLast(1).get();
    
    if (snap.exists()) {
      console.log("Success! Data:", Object.keys(snap.val()));
    } else {
      console.log("Success! No data found.");
    }
  } catch (e) {
    console.error("Firebase Test Error:", e);
  }
  process.exit(0);
}

testFirebase();
