/*
 * Setup: set APPS_SCRIPT_URL to your deployed Google Apps Script Web App URL.
 * No API key or secret belongs in this file.
 */
const CONFIG = {
  productName: "আপনার প্রোডাক্টের নাম",
  productPrice: 500,
  dhakaDelivery: 70,
  outsideDhakaDelivery: 130,
  maxQuantity: 20,
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxgg8gwiBU3EYbN_2tKho9Wd9-S0xlRAgBjIr4dnJQAoYxqpYpxTg1EY98sr_YRAcw/exec",
};

const $ = (id) => document.getElementById(id);
const form = $("orderForm");
const gatewayForm = $("gatewayForm");
const gatewayPayload = $("gatewayPayload");
const iframe = $("appsScriptFrame");
const submitBtn = $("submitBtn");
const formError = $("formError");
let quantity = 1;
let submitting = false;
let submissionToken = "";

const formatBDT = (value) => "৳" + new Intl.NumberFormat("bn-BD", {
  maximumFractionDigits: 0
}).format(value);

function selectedArea() {
  return form.querySelector('input[name="deliveryArea"]:checked')?.value || "inside";
}
function currentDelivery() {
  return selectedArea() === "inside" ? CONFIG.dhakaDelivery : CONFIG.outsideDhakaDelivery;
}
function updateSummary() {
  const subtotal = quantity * CONFIG.productPrice;
  const delivery = currentDelivery();
  $("quantityOutput").textContent = new Intl.NumberFormat("bn-BD").format(quantity);
  $("summaryQty").textContent = new Intl.NumberFormat("bn-BD").format(quantity);
  $("subtotal").textContent = formatBDT(subtotal);
  $("deliveryCost").textContent = formatBDT(delivery);
  $("grandTotal").textContent = formatBDT(subtotal + delivery);
  $("insideLabel").classList.toggle("selected", selectedArea() === "inside");
  $("outsideLabel").classList.toggle("selected", selectedArea() === "outside");
}
function setError(inputId, errorId, message) {
  const input = $(inputId);
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  $(errorId).textContent = message || "";
}
function normalizePhone(value) {
  return value.replace(/[\s()-]/g, "");
}
function validateForm() {
  let valid = true;
  const name = $("customerName").value.trim();
  const phone = normalizePhone($("phone").value.trim());
  const address = $("address").value.trim();

  const nameError = name.length < 2 ? "কমপক্ষে ২ অক্ষরের নাম লিখুন।" : "";
  const phoneError = /^(?:\+?8801|01)[3-9]\d{8}$/.test(phone) ? "" : "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন 01XXXXXXXXX)।";
  const addressError = address.length < 8 ? "কমপক্ষে ৮ অক্ষরের সম্পূর্ণ ঠিকানা লিখুন।" : "";

  setError("customerName", "nameError", nameError);
  setError("phone", "phoneError", phoneError);
  setError("address", "addressError", addressError);
  valid = !nameError && !phoneError && !addressError;
  if (!valid) {
    const first = form.querySelector(".invalid");
    first?.focus();
  }
  return valid;
}
function setSubmitting(value) {
  submitting = value;
  submitBtn.disabled = value;
  $("submitText").textContent = value ? "অর্ডার পাঠানো হচ্ছে..." : "অর্ডার কনফার্ম করুন";
}
function createOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}
function showFormError(message) {
  formError.textContent = message;
}
function resetForNewOrder() {
  $("successPanel").hidden = true;
  form.hidden = false;
  form.reset();
  quantity = 1;
  updateSummary();
  showFormError("");
  setError("customerName", "nameError", "");
  setError("phone", "phoneError", "");
  setError("address", "addressError", "");
  $("customerName").focus();
}

$("productName").textContent = CONFIG.productName;
$("year").textContent = new Date().getFullYear();
$("minusBtn").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  updateSummary();
});
$("plusBtn").addEventListener("click", () => {
  if (quantity < CONFIG.maxQuantity) {
    quantity += 1;
    updateSummary();
  } else {
    showFormError(`একটি অর্ডারে সর্বোচ্চ ${CONFIG.maxQuantity} পিস নেওয়া যাবে।`);
  }
});
form.querySelectorAll('input[name="deliveryArea"]').forEach((radio) => {
  radio.addEventListener("change", updateSummary);
});
["customerName", "phone", "address"].forEach((id) => {
  $(id).addEventListener("input", () => {
    $(id).classList.remove("invalid");
    const map = { customerName: "nameError", phone: "phoneError", address: "addressError" };
    $(map[id]).textContent = "";
  });
});
$("newOrderBtn").addEventListener("click", resetForNewOrder);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submitting) return;
  showFormError("");

  if (!validateForm()) {
    showFormError("সাবমিট করার আগে চিহ্নিত তথ্যগুলো ঠিক করুন।");
    return;
  }
  if (!CONFIG.appsScriptUrl.startsWith("https://script.google.com/macros/s/") ||
      CONFIG.appsScriptUrl.includes("PASTE_YOUR")) {
    showFormError("সাইটে অর্ডার সংরক্ষণ চালু হয়নি। আগে README-র ধাপ অনুসারে Google Apps Script URL সেট করুন।");
    return;
  }

  const area = selectedArea();
  const subtotal = quantity * CONFIG.productPrice;
  const delivery = currentDelivery();
  submissionToken = createOrderId();
  const order = {
    orderId: submissionToken,
    productName: CONFIG.productName,
    quantity,
    unitPrice: CONFIG.productPrice,
    subtotal,
    deliveryArea: area === "inside" ? "ঢাকার ভিতর" : "ঢাকার বাহিরে",
    deliveryCharge: delivery,
    total: subtotal + delivery,
    customerName: $("customerName").value.trim(),
    phone: normalizePhone($("phone").value.trim()),
    address: $("address").value.trim(),
    note: $("note").value.trim(),
    clientTimestamp: new Date().toISOString()
  };

  gatewayForm.action = CONFIG.appsScriptUrl;
  gatewayPayload.value = JSON.stringify(order);
  setSubmitting(true);
  $("orderForm").hidden = true;
  // The iframe receives the Apps Script HTML response, which posts success/failure to this page.
  gatewayForm.submit();

  // If the endpoint doesn't respond, don't claim success.
  window.clearTimeout(window.__orderTimeout);
  window.__orderTimeout = window.setTimeout(() => {
    if (!submitting) return;
    setSubmitting(false);
    form.hidden = false;
    showFormError("অর্ডারের উত্তর পাওয়া যায়নি। ইন্টারনেট সংযোগ ও Apps Script deployment যাচাই করে আবার চেষ্টা করুন। অর্ডারটি আগে জমা হয়ে থাকতে পারে—পুনরায় সাবমিট করার আগে Google Sheet দেখে নিন।");
  }, 25000);
});

window.addEventListener("message", (event) => {
  // Apps Script HTML response sends only a structured message; verify the sender host.
  if (!event.origin.endsWith("googleusercontent.com") &&
      !event.origin.endsWith("script.google.com")) return;
  const data = event.data;
  if (!data || data.source !== "product-order-apps-script" || !submitting) return;

  window.clearTimeout(window.__orderTimeout);
  setSubmitting(false);
  if (data.ok === true && data.orderId === submissionToken) {
    form.hidden = true;
    $("successPanel").hidden = false;
    $("orderIdText").textContent = data.orderId;
    $("successPanel").scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    form.hidden = false;
    showFormError(data.message || "অর্ডার সংরক্ষণ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।");
  }
});

updateSummary();
