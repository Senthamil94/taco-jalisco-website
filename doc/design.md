# Design: Events & Hiring Form Notifications (Email + SMS)

## Problem
Tacos Jalisco wants two existing forms — "We are hiring" (`hiring.html`) and "Events" inquiry (`events.html`) — to notify the restaurant owner by **email and SMS** on submission, as fast as possible. Both forms are already fully built (fields, client-side validation, submit JS); they currently POST to a third-party `formsubmit.co` endpoint, with a stopgap email-to-carrier-gateway hack for SMS that targets the wrong number (707-731-4087, not the owner's real number, 707-647-0554).

The company already runs `boons-notification-api` (Hapi/Node), which exposes:
- `POST /sendEmail` (SendGrid) — `{ toEmail: string[], subject: string, message: string }`
- `POST /send-message` (Twilio) — `{ phone_number: string, country: string, messageText: string, user_type: string }`

Both routes have **zero enforced authentication today** — the auth check is commented out at the route level, and the fallback `AUTH` env flag is `false` in every environment. CORS is also wide open (`origin: '*'`). Calling either endpoint straight from the browser would expose an unauthenticated write endpoint to anyone who reads the page's JS — a spam/cost-abuse risk, and a direct conflict with the "don't compromise on security" requirement for this engagement.

## Approaches considered

### A — Shared cross-site form SDK (rejected)
An internal team idea for a platform-wide capability: a lightweight SDK embedded across *all* boons static customer sites, dynamically injecting forms configured in a back-office system, firing `boons-notification-api` from an iframe — assuming CORS/AUTH get hardened platform-wide first. Rejected for this engagement: it's a platform investment, not a fix for one customer, it doesn't exist yet, and it depends on `boons-notification-api` auth/CORS being fixed on a timeline nobody owns.

### B — Monolithic Next.js app on AWS Amplify (evaluated, deferred)
Rewrite the static site as a Next.js app, add two Next.js API routes that call `boons-notification-api` server-to-server, host on AWS Amplify Hosting (connected to a new AWS CodeCommit repo), running alongside the existing S3+CloudFront+Route53 site until a domain cutover. This correctly hides the notification API behind a server boundary, and static generation preserves SEO and accessibility parity with the current site (no client-only rendering).

Deferred for now: it requires converting 4 static HTML pages to JSX and standing up a new hosting/CI pipeline — more work than the customer's timeline allows. Kept on record as the natural next step if boons ends up doing this for more than one customer site (Approach A becomes worth building once there's a real multi-tenant need; this is the single-tenant stepping stone).

### C — AWS Lambda proxy (selected)
Keep the site exactly as it is today — plain static HTML/CSS/JS on the existing S3+CloudFront+Route53 setup, zero hosting changes. Add two small, independent AWS Lambda functions, each exposed via a **Lambda Function URL**, that the existing forms' inline JS calls instead of `formsubmit.co`. Each Lambda validates the submission and calls `boons-notification-api` server-side — the notification API is never reachable from the browser, which closes the same security gap as Approach B, for a fraction of the engineering cost.

This is the approach implemented here.

## Architecture

```
Browser (tacosjaliscovallejo.com, unchanged S3+CloudFront+Route53)
   │  fetch POST (FormData)
   ▼
AWS Lambda Function URL (hiring-application / event-inquiry)
   │  server-to-server, no browser access
   ▼
boons-notification-api  ──▶  SendGrid (/sendEmail)
                         └─▶  Twilio    (/send-message)
```

### Why Lambda Function URLs, not API Gateway
A Lambda Function URL is a built-in, dedicated HTTPS endpoint for a single function — no separate API Gateway resource to create or maintain. API Gateway earns its keep when you need multiple routes behind one gateway, usage-plan throttling, API keys, or custom domain path mapping — none of which this two-endpoint use case needs. Function URLs are the simpler, cheaper, correct choice here.

### CORS
The browser calling a Lambda Function URL is a cross-origin request (`tacosjaliscovallejo.com` → `*.lambda-url.<region>.on.aws`), so CORS must be configured explicitly. This is done in the Function URL's own CORS settings (see "Deployment steps" below) — no handler code needed, AWS answers the `OPTIONS` preflight automatically. The origin allow-list is locked to `https://tacosjaliscovallejo.com` only, which is *stricter* than `boons-notification-api`'s current `origin: '*'` — this design tightens exposure rather than adding to it.

### Anti-spam
Both forms already carry a hidden honeypot field (`_honey`, invisible to real users, commonly auto-filled by bots). Each Lambda checks it server-side and silently no-ops (`200 OK`, no downstream calls) if it's non-empty. The `formsubmit.co`-specific hidden fields (`_subject`, `_template`, `_captcha`, `_cc`) are removed from both forms — they're meaningless to this backend.

### Contact info & test vs. production values
`OWNER_EMAIL` / `OWNER_PHONE` / `OWNER_PHONE_COUNTRY` are Lambda **environment variables**, not hardcoded in source — required so swapping test values for the real customer contact is a config-only change (edit the env var, no code deploy).

While validating the pipeline, both Lambdas are configured with internal boons test values so nobody spams the real owner mid-testing:
- `OWNER_EMAIL=dev@boons.io`
- `OWNER_PHONE=+15709834561`

Once the team confirms the end-to-end flow works, these are switched to the real values in the Lambda console/IaC — no code change:
- `OWNER_EMAIL=tacosjaliscovallejo@gmail.com`
- `OWNER_PHONE=+17077314087`

### Resume handling (hiring form only)
`boons-notification-api`'s plain `/sendEmail` route doesn't support attachments (only the auth-gated `/sendEmail/campaign` route does, and even that requires base64-encoding the file into the payload). Instead, the hiring Lambda uploads the resume PDF to a private S3 bucket and includes a short-lived (7-day) presigned link in the notification email body — simpler, avoids payload-size limits, and the bucket stays private (no public objects).

## API contracts used (from `boons-notification-api`)

```
POST /sendEmail
{ "toEmail": ["dev@boons.io"], "subject": "...", "message": "<html>" }

POST /send-message
{ "phone_number": "+15709834561", "country": "US", "messageText": "...", "user_type": "" }
```

Source: `boons-notification-api/app/routes/Notification/{SendEmail,Messaging}.js`, `app/validators/emailValidator.js`, `app/services/NotificationService/{EmailService,MessagingService}.js`.

## Code changes

### Frontend (`site/hiring.html`, `site/events.html`)
- `JOBFORM_ENDPOINT` / `EVENTFORM_ENDPOINT` changed from the `formsubmit.co` URL to the deployed Lambda Function URL.
- Removed hidden fields `_subject`, `_template`, `_captcha`, `_cc` (formsubmit.co / carrier-gateway specific). Kept `_honey`.
- No other JS logic changes — the existing `fetch(...).then/.catch/.finally`, button-disable/"Sending…" state, and success/error UI (`#jfOk`/`#jfErr`, `#efOk`/`#efErr`) already expect "POST FormData, get an ok/not-ok response," which is exactly what the Lambda returns.

### New: `lambda/`
- `lambda/lib/notificationClient.js` — thin wrapper: `sendEmail()`, `sendSms()`, calling `boons-notification-api`.
- `lambda/lib/notify.js` — shared `notifyOwner()`: fires email + SMS concurrently (`Promise.allSettled`), returns success if email succeeds (SMS failure is logged, not fatal — matches the "email + SMS" ask without making the whole submission fail over an SMS hiccup).
- `lambda/event-inquiry/index.js` — parses the event form, checks honeypot + required fields, builds the notification content, calls `notifyOwner()`.
- `lambda/hiring-application/index.js` — same pattern, plus resume upload to S3 and presigned-link generation.

## Deployment steps

Repeat for both `hiring-application` and `event-inquiry`:

1. **Create the function** — AWS Console → Lambda → Create function. Runtime: Node.js 20.x. Upload the corresponding `lambda/<name>/index.js` bundled with `lambda/lib/` and `node_modules` (`npm install` inside `lambda/` first).
2. **Environment variables** — Configuration → Environment variables: `NOTIFICATION_API_BASE_URL`, `OWNER_EMAIL`, `OWNER_PHONE`, `OWNER_PHONE_COUNTRY`, and (hiring only) `RESUME_S3_BUCKET`. Start with the test values in `.env.example`.
3. **Function URL** — Configuration → Function URL → Create function URL:
   - Auth type: `NONE` (public — the browser must call it without credentials; the honeypot + field validation are the abuse controls here, not IAM auth).
   - CORS (same screen): Allow origin `https://tacosjaliscovallejo.com`, allow methods `POST`, allow headers `content-type`, credentials off.
4. **IAM execution role** — default CloudWatch Logs write, plus `s3:PutObject`/`s3:GetObject` scoped to the resume bucket/prefix (hiring function only). Nothing broader.
5. **Test directly** with `curl -X POST <function-url> ...` before wiring the frontend — confirm the email/SMS land at the test values, not the real customer contact.
6. **Wire the frontend** — paste the generated Function URL into `JOBFORM_ENDPOINT` / `EVENTFORM_ENDPOINT` in `site/hiring.html` / `site/events.html`, then re-upload `site/` to S3 (see root `README.md`).

## Verification
- Direct Lambda invoke (curl) with a valid payload → `200`, notification received at test values.
- Direct invoke with `_honey` populated → `200`, no downstream calls (check CloudWatch logs — no `sendEmail`/`send-message` calls made).
- Hiring Lambda with a PDF resume → S3 upload succeeds, presigned link appears in the logged email body.
- Browser CORS check: `fetch()` from `https://tacosjaliscovallejo.com` succeeds; `fetch()` from any other origin is blocked by the browser.
- Live form submission (both forms) → success/error UI renders correctly, notification lands at the test values.
- Go-live: swap `OWNER_EMAIL`/`OWNER_PHONE` env vars to the real customer contact — config-only, no redeploy.
- Regression: confirm `index.html`/`menu.html` and the rest of the site are unaffected — no hosting changes were made to the existing S3/CloudFront/Route53 setup.

## Future direction
If boons ends up doing this kind of integration for more than one customer site, Approach B (or eventually Approach A) becomes worth the investment. For a single customer on a tight timeline, Approach C is the right-sized solution: it closes the actual security gap (unauthenticated notification API reachable from a browser) without taking on a framework migration or new hosting pipeline.
