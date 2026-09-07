# Implementation Plan: Events & Hiring Form Notifications

Companion to [`design.md`](design.md) (architecture/rationale) and root [`README.md`](../README.md) (deploy commands). This doc is the staggered build order and the exact code-level changes, stage by stage.

## Overall status
| Stage | Code | AWS deployment |
|---|---|---|
| 1 — Lambda functions | **DONE** | **PENDING** (team to deploy) |
| 2 — Frontend wiring | **DONE** | **PENDING** (blocked on Stage 1 URLs, then S3 sync) |
| 3 — Go-live cutover | n/a | **NOT STARTED** (deliberately deferred) |

## Stage 1 — Lambda functions (build & verify independently, before touching the site)

**Status: PARTIALLY DONE** — code is written and committed to this repo; AWS deployment and verification are still pending (team action, outside this repo).

| Step | What | Status |
|---|---|---|
| 1 | `lambda/lib/notificationClient.js` — `sendEmail()`/`sendSms()` wrappers around `boons-notification-api`'s `/sendEmail` and `/send-message` | **DONE** |
| 2 | `lambda/lib/notify.js` — shared `notifyOwner()`: fires email+SMS concurrently via `Promise.allSettled`, email result decides the HTTP response | **DONE** |
| 3 | `lambda/event-inquiry/index.js` — honeypot check → required-field validation → `notifyOwner()` | **DONE** |
| 4 | `lambda/hiring-application/index.js` — same, plus resume PDF → S3 → presigned link in the email body | **DONE** |
| 5 | Deploy both as Lambda Function URLs (Node.js 20.x), env vars set to **test** values, CORS locked to `https://tacosjaliscovallejo.com` — see `README.md` Stage 1 for exact console steps | **PENDING** (AWS console/IaC action) |
| 6 | `curl` each Function URL directly with test payloads — confirm 200 + notification lands at `dev@boons.io` / `+15709834561`, **before** any frontend change | **PENDING** |

No frontend file is touched in this stage — fully testable in isolation.

## Stage 2 — Frontend wiring (mechanical, after Stage 1 is verified)

**Status: PARTIALLY DONE** — `site/hiring.html`/`site/events.html` markup and JS are already updated (formsubmit.co removed, honeypot kept). Endpoint URLs are still placeholders and S3 hasn't been re-synced — both blocked on Stage 1's Function URLs existing.

### `site/hiring.html`

**Before:**
```html
<!-- ═══ APPLICATION FORM (FormSubmit — no backend needed) ═══
     • Applications are emailed to tacosjaliscovallejo@gmail.com
       (JOBFORM_ENDPOINT in the <script> below). ...
     • SMS copy goes to +1 (707) 731-4087 through the carrier's
       email-to-SMS gateway in the "_cc" field below. ...            -->
<form class="jobform" id="jobform" novalidate>
  <input type="hidden" name="_subject" value="New job application — Tacos Jalisco">
  <input type="hidden" name="_template" value="table">
  <input type="hidden" name="_captcha" value="false">
  <input type="hidden" name="_cc" value="7077314087@vtext.com">
  <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
  ...
```
```js
var JOBFORM_ENDPOINT='https://formsubmit.co/ajax/tacosjaliscovallejo@gmail.com';
...
var data=new FormData(jf);
if(!data.get('_cc'))data.delete('_cc');
fetch(JOBFORM_ENDPOINT, ...)
```

**After:**
```html
<!-- ═══ APPLICATION FORM ═══
     Submits to an AWS Lambda Function URL (JOBFORM_ENDPOINT below),
     which notifies the restaurant owner by email + SMS via
     boons-notification-api. See /doc/design.md for the full design. -->
<form class="jobform" id="jobform" novalidate>
  <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
  ...
```
```js
var JOBFORM_ENDPOINT='https://<lambda-id>.lambda-url.<region>.on.aws/'; // <- set after Stage 1 deploy
...
var data=new FormData(jf);
fetch(JOBFORM_ENDPOINT, ...)
```

**Remaining action (PENDING):** replace `<lambda-id>.lambda-url.<region>.on.aws` with the real hiring-application Function URL from Stage 1.

### `site/events.html`

Same pattern: `_subject`/`_template`/`_captcha`/`_cc` hidden fields removed (honeypot `_honey` kept), the `if(!data.get('_cc'))data.delete('_cc')` line removed, and:
```js
var EVENTFORM_ENDPOINT='https://<lambda-id>.lambda-url.<region>.on.aws/'; // <- set after Stage 1 deploy
```

**Remaining action (PENDING):** replace the placeholder with the real event-inquiry Function URL from Stage 1.

### Deploy the frontend change — **PENDING**
```
aws s3 sync site/ s3://<your-bucket-name>/ --delete
```
No CloudFront/Route53 changes — same distribution, same domain, only object contents change.

## Stage 3 — Go-live cutover to real contact info

**Status: NOT STARTED** — deliberately deferred until Stage 1+2 are confirmed working.

| Step | What | Status |
|---|---|---|
| 1 | In the Lambda console (or IaC), change `OWNER_EMAIL` from `dev@boons.io` → `tacosjaliscovallejo@gmail.com` on both functions | **PENDING** |
| 2 | Change `OWNER_PHONE` from `+15709834561` → `+17077314087` on both functions | **PENDING** |
| 3 | No code change, no redeploy, no S3 re-upload — env var edit only | — |
| 4 | Submit one real test on each form, confirm the email/SMS land at the real owner's inbox/phone | **PENDING** |

## What's explicitly out of scope for this round
- Approach A (shared cross-site SDK) and Approach B (Next.js/Amplify rewrite) — documented in `design.md` as considered/deferred, not built.
- A restaurant-details lookup API to replace the hardcoded `OWNER_EMAIL`/`OWNER_PHONE` env vars — customer asked for speed; env vars are the correct level of effort for a single customer.
- API Gateway, WAF, rate limiting beyond the honeypot — not needed for 2 low-volume public forms; revisit if abuse is observed.
