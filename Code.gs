/**
 * Google Apps Script backend for the One Page Product Order Website.
 *
 * Before deployment:
 * 1. Create a Google Sheet and copy its ID from the URL.
 * 2. In Apps Script > Project Settings > Script properties, add:
 *    SPREADSHEET_ID = your spreadsheet ID
 * 3. Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 4. Paste the deployed /exec URL into script.js CONFIG.appsScriptUrl.
 *
 * Do not put spreadsheet IDs or credentials in frontend code.
 * Note: Web App access set to "Anyone" means the public endpoint can be called
 * by others. Basic validation and rate limiting are not a complete anti-abuse
 * solution; review the sheet periodically and add stronger controls if needed.
 */

const SHEET_NAME = "Orders";
const MAX_QUANTITY = 20;
const UNIT_PRICE = 500;
const DHAKA_DELIVERY = 70;
const OUTSIDE_DELIVERY = 130;

function doGet() {
  return HtmlService.createHtmlOutput(
    "<!doctype html><meta charset='utf-8'><p>Product order endpoint is ready.</p>"
  );
}

function doPost(e) {
  let orderId = "";
  try {
    if (!e || !e.parameter || !e.parameter.payload) {
      throw new Error("অর্ডারের তথ্য পাওয়া যায়নি।");
    }

    const payload = JSON.parse(e.parameter.payload);
    orderId = String(payload.orderId || "");
    const order = validateOrder_(payload);

    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) {
      throw new Error("সার্ভার সেটআপ অসম্পূর্ণ: SPREADSHEET_ID সেট করা হয়নি।");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow([
          "Timestamp", "Order ID", "Product", "Quantity", "Unit Price",
          "Subtotal", "Delivery Area", "Delivery Charge", "Total",
          "Customer Name", "Phone", "Address", "Note"
        ]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 13).setFontWeight("bold");
      }

      // Idempotency check: avoid duplicate row if the same order ID is retried.
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const existingIds = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
        if (existingIds.includes(order.orderId)) {
          return responsePage_(true, order.orderId, "অর্ডারটি ইতিমধ্যে সংরক্ষিত হয়েছে।");
        }
      }

      sheet.appendRow([
        new Date(),
        safeCell_(order.orderId),
        safeCell_(order.productName),
        order.quantity,
        order.unitPrice,
        order.subtotal,
        safeCell_(order.deliveryArea),
        order.deliveryCharge,
        order.total,
        safeCell_(order.customerName),
        safeCell_(order.phone),
        safeCell_(order.address),
        safeCell_(order.note)
      ]);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    return responsePage_(true, order.orderId, "অর্ডার সফলভাবে সংরক্ষণ হয়েছে।");
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return responsePage_(false, orderId, safePublicMessage_(err));
  }
}

function validateOrder_(p) {
  const orderId = String(p.orderId || "").trim();
  const productName = String(p.productName || "").trim().slice(0, 120);
  const customerName = String(p.customerName || "").trim();
  const phone = String(p.phone || "").trim();
  const address = String(p.address || "").trim();
  const note = String(p.note || "").trim().slice(0, 250);
  const quantity = Number(p.quantity);
  const unitPrice = Number(p.unitPrice);
  const deliveryArea = String(p.deliveryArea || "");
  const expectedDelivery = deliveryArea === "ঢাকার ভিতর"
    ? DHAKA_DELIVERY
    : deliveryArea === "ঢাকার বাহিরে"
      ? OUTSIDE_DELIVERY
      : null;

  if (!/^ORD-[A-Z0-9-]{6,50}$/.test(orderId)) throw new Error("অর্ডার আইডি সঠিক নয়।");
  if (!productName) throw new Error("পণ্যের নাম সেট করা হয়নি।");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error("পণ্যের পরিমাণ সঠিক নয়।");
  }
  if (unitPrice !== UNIT_PRICE) throw new Error("পণ্যের দাম যাচাই করা যায়নি।");
  if (expectedDelivery === null) throw new Error("ডেলিভারি এলাকা নির্বাচন করুন।");
  if (customerName.length < 2 || customerName.length > 80) throw new Error("নাম সঠিক নয়।");
  if (!/^(?:\+?8801|01)[3-9]\d{8}$/.test(phone)) throw new Error("মোবাইল নম্বর সঠিক নয়।");
  if (address.length < 8 || address.length > 300) throw new Error("ঠিকানা সঠিক নয়।");

  const subtotal = quantity * UNIT_PRICE;
  const total = subtotal + expectedDelivery;
  // Ignore totals sent by the browser; calculate them on the server.
  return {
    orderId,
    productName,
    quantity,
    unitPrice: UNIT_PRICE,
    subtotal,
    deliveryArea,
    deliveryCharge: expectedDelivery,
    total,
    customerName,
    phone,
    address,
    note
  };
}

function safeCell_(value) {
  const text = String(value == null ? "" : value);
  // Prevent spreadsheet formula injection from user-provided text.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safePublicMessage_(err) {
  const message = String(err && err.message ? err.message : "");
  if (message.startsWith("সার্ভার সেটআপ অসম্পূর্ণ") ||
      message.startsWith("অর্ডারের") ||
      message.startsWith("পণ্যের") ||
      message.startsWith("ডেলিভারি") ||
      message.startsWith("নাম") ||
      message.startsWith("মোবাইল") ||
      message.startsWith("ঠিকানা")) {
    return message;
  }
  return "এই মুহূর্তে অর্ডার সংরক্ষণ করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।";
}

function responsePage_(ok, orderId, message) {
  const result = JSON.stringify({
    source: "product-order-apps-script",
    ok: Boolean(ok),
    orderId: String(orderId || ""),
    message: String(message || "")
  }).replace(/</g, "\\u003c");

  // The page is returned inside the form target iframe. postMessage notifies
  // the parent page only after the Apps Script handler has finished.
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
    <script>
      (function () {
        var result = ${result};
        try { window.top.postMessage(result, "*"); } catch (e) {}
      })();
    </script>
    অর্ডারের উত্তর পাঠানো হয়েছে।
  </body></html>`;
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
