# One Page Product Order Website (Bangla)

A responsive, single-page product order website using HTML, CSS, JavaScript, Google Sheets, Google Apps Script, and Netlify.

## Included files

- `index.html` — page structure and Bengali order form
- `style.css` — responsive design
- `script.js` — live quantity/price calculation, validation, order submit
- `Code.gs` — Google Apps Script endpoint that validates and saves orders
- `netlify.toml` — simple static-site configuration

## Default pricing

- Product: ৳500 each
- Delivery inside Dhaka: ৳70
- Delivery outside Dhaka: ৳130
- Maximum quantity per order: 20

Change pricing in BOTH `script.js` and `Code.gs`. The backend independently calculates totals; changing only the frontend is not enough.

---

## Part A — Create the Google Sheet

1. Sign in to Google and create a new Google Sheet.
2. Copy the spreadsheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. You can leave the sheet blank; the script will create a tab named `Orders` and add headers automatically.

## Part B — Set up Google Apps Script

1. Open https://script.google.com/
2. Create a new project.
3. Replace the starter code with the contents of `Code.gs`.
4. Open **Project Settings** (gear icon) → **Script properties** → **Add script property**.
   - Property: `SPREADSHEET_ID`
   - Value: your Google Sheet ID
5. Save the project.
6. Click **Deploy** → **New deployment**.
7. Select the gear/type menu → **Web app**.
8. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Click **Deploy**, approve the requested permissions, and copy the Web app URL ending in `/exec`.

### Important deployment notes

- The endpoint must be publicly reachable for a public order form. This means someone who discovers the URL could attempt to call it directly. Server-side validation is included, but it is not a full anti-spam system.
- Never put Google account passwords, OAuth tokens, service-account keys, or other secrets in `index.html` or `script.js`.
- Keep the Google Sheet private; do not share it publicly.
- If you change the Apps Script code after deployment, open **Deploy → Manage deployments → Edit** and create a new version, then deploy it.
- Apps Script quotas and Google account policies apply.

## Part C — Connect the website to Apps Script

1. Open `script.js`.
2. Find:

   `appsScriptUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"`

3. Replace the placeholder with the deployed `/exec` URL, for example:

   `appsScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"`

4. Save the file.

The URL is an endpoint, not an API secret. Do not paste any credential or private key into the frontend.

## Part D — Customize product details

In `index.html`, search for:
- `আপনার ব্র্যান্ড`
- `আপনার প্রোডাক্টের নাম`
- the sample product description
- the illustrative product art

In `script.js`, update:

```js
productName: "আপনার প্রোডাক্টের নাম",
productPrice: 500,
dhakaDelivery: 70,
outsideDhakaDelivery: 130,
maxQuantity: 20,
```

Also update the matching constants at the top of `Code.gs`:

```js
const UNIT_PRICE = 500;
const DHAKA_DELIVERY = 70;
const OUTSIDE_DELIVERY = 130;
const MAX_QUANTITY = 20;
```

The product name in the frontend and the backend should match the product you are actually selling. Replace the illustrative CSS artwork with your actual product image if you have one.

## Part E — Deploy to Netlify for free

### Easiest method: Netlify Drop

1. Go to https://app.netlify.com/drop and sign in/create an account.
2. Upload the project folder contents (`index.html`, `style.css`, `script.js`, and `netlify.toml`) or drag the folder into the drop area.
3. Netlify will provide a public site URL.
4. Open the site URL and test a small order.
5. Confirm that the row appears in your private Google Sheet before using the site publicly.

### Git-based deployment

1. Create a GitHub repository and upload the frontend files (`index.html`, `style.css`, `script.js`, `netlify.toml`). Do not upload private credentials.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Connect the repository.
4. Build command: leave blank.
5. Publish directory: `.` (the repository root).
6. Deploy the site.

## How to test

1. Change quantity from 1 to 2. Subtotal should become ৳1,000.
2. Select “ঢাকার ভিতর”. Total for 1 item should be ৳570.
3. Select “ঢাকার বাহিরে”. Total for 1 item should be ৳630.
4. Submit an invalid phone number; the form should show an error.
5. Submit valid test details. Wait for the success message and verify the new row in Google Sheets.
6. If no response appears, check Apps Script **Executions**, confirm the `/exec` URL, and verify the `SPREADSHEET_ID` Script property. Check the sheet before retrying; a timeout does not always mean the order was not saved.

## Privacy and abuse notes

- Tell customers how their name, phone, and address will be used. Store only what is needed to fulfill orders.
- Do not make the Sheet public.
- This sample does not include CAPTCHA, SMS verification, an order-management login, or robust rate limiting. For a high-traffic public store, add stronger anti-abuse controls and consider a backend with explicit CORS, authentication, and rate limits.
- The form is designed to show success only when the Apps Script response reaches the page. Browser privacy settings, Google deployment behavior, or network issues can prevent the response from being received; test in the browser you plan to use before launch.
- The Apps Script endpoint is public because the customer form needs to call it. Server-side validation protects the calculated amount from simple client-side tampering, but it does not prove that every request came from your website.
