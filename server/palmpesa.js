
export async function createPalmpesaOrder({
  apiKey,
  userId,
  vendor,
  orderId,
  buyerEmail,
  buyerName,
  buyerPhone,
  amount,
  webhookUrl,
}) {
  const url = "https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate";

  // Phone formatting: USSD push often requires 07XXXXXXXX format instead of 2557XXXXXXXX
  let phone = buyerPhone.replace(/\s+/g, "").replace(/^\+/, "");
  if (phone.startsWith("255")) {
    phone = "0" + phone.substring(3);
  } else if (phone.length === 9 && !phone.startsWith("0")) {
    phone = "0" + phone;
  }

  const body = {
    user_id: userId,
    vendor: vendor,
    name: buyerName,
    email: buyerEmail,
    phone: phone,
    amount: Math.round(Number(amount)),
    transaction_id: orderId,
    address: "Tanzania",
    postcode: "00000",
    callback_url: webhookUrl,
  };

  console.log("Initiating PalmPesa Order:", JSON.stringify({ ...body, email: "REDACTED" }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  let data;
  const text = await response.text();
  console.log(`PalmPesa Response [${response.status}]:`, text);

  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { error: "Non-JSON response from PalmPesa", status: response.status, details: text };
  }
  return data;
}

export function isPalmpesaSuccess(payload) {
  // Based on docs, success returns { "message": "Payment initiated...", "order_id": "PALMPESA..." }
  return !!payload?.order_id || payload?.message?.includes("initiated");
}

export function extractPalmpesaUrl(payload) {
  // USSD push does not return a gateway URL
  return null;
}

export async function checkPalmpesaStatus({ apiKey, orderId }) {
  const url = "https://palmpesa.drmlelwa.co.tz/api/order-status";
  const body = { order_id: orderId };
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  
  let data;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { error: "Non-JSON response from PalmPesa", status: response.status, details: text };
  }
  return data;
}
