# Tacos Jalisco — Website + Form Notifications

Email + SMS notifications for the "We are hiring" and "Events" forms, wired via a small AWS Lambda proxy so `boons-notification-api` is never called from the browser. Full rationale and alternatives considered: [`doc/design.md`](doc/design.md).

## What's in this repo

```
site/     ← the full customer website, ready to deploy as-is to S3
lambda/   ← 2 AWS Lambda functions (form -> email + SMS notification)
doc/      ← design doc
```

`site/` is a complete, deployable bundle — not a diff. It contains every file the current live site needs (`index.html`, `menu.html`, `hiring.html`, `events.html`, `config.js`, `accessibility.css`, `accessibility.js`, `assets/`), with `hiring.html` and `events.html` already updated to call the new Lambda endpoints instead of `formsubmit.co`. Upload/replace the whole folder — no need to pick out individual files.

## What changed vs. the current live site
- `hiring.html` / `events.html`: submit endpoint switched from `formsubmit.co` to an AWS Lambda Function URL (placeholder `https://<lambda-id>.lambda-url.<region>.on.aws/` until Stage 1 below is deployed).
- Removed the `formsubmit.co`-specific hidden fields (`_subject`, `_template`, `_captcha`, `_cc`) — the old SMS-via-email-gateway hack (wrong number, 707-731-4087) is gone, replaced by real Twilio SMS via `boons-notification-api`. The honeypot field (`_honey`) is unchanged.
- Everything else (`index.html`, `menu.html`, `config.js`, `accessibility.*`, `assets/`) is untouched, copied as-is.

## Next steps for the team

**Stage 1 — deploy the 2 Lambdas** (do this first; nothing on the live site changes yet)
1. `cd lambda && npm install` to pull in dependencies (`lambda-multipart-parser`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
2. For each of `lambda/hiring-application/` and `lambda/event-inquiry/`, follow **Deployment steps** in [`doc/design.md`](doc/design.md#deployment-steps): create the function (Node.js 20.x), set environment variables (start with the test values in `lambda/.env.example`), enable a Function URL with CORS locked to `https://tacosjaliscovallejo.com`, and attach a minimal IAM role (S3 put/get scoped to the resume bucket for the hiring function only).
3. `hiring-application` also needs a private S3 bucket for resumes — create it (`tacos-jalisco-applications` or your naming convention) before deploying that function, and set `RESUME_S3_BUCKET` to match.
4. Test each Function URL directly with `curl` (examples in `doc/design.md`) using the **test** contact values (`dev@boons.io` / `+15709834561`) — confirm the email and SMS actually arrive before touching the site.

**Stage 2 — point the site at the Lambdas**
5. In `site/hiring.html` and `site/events.html`, replace the placeholder `JOBFORM_ENDPOINT` / `EVENTFORM_ENDPOINT` values with the real Function URLs from Stage 1.
6. Deploy `site/` to S3, e.g.:
   ```
   aws s3 sync site/ s3://<your-bucket-name>/ --delete
   ```
   (Or upload/replace the contents of the existing bucket through the S3 console — the whole `site/` folder maps 1:1 to the bucket root.) CloudFront/Route53 need no changes — same domain, same distribution, only the file contents change.
7. Submit both forms on the live site and confirm the email/SMS still land at the **test** values.

**Stage 3 — go live with the real contact info**
8. Once confirmed working, update the Lambda environment variables `OWNER_EMAIL` and `OWNER_PHONE` from the test values to the real customer contact (`tacosjaliscovallejo@gmail.com` / `+17077314087`) in the Lambda console — config-only change, no code deploy, no S3 re-upload needed.

## Verification checklist
See the **Verification** section of [`doc/design.md`](doc/design.md#verification) for the full list (honeypot no-op check, CORS check, resume-upload check, etc.).
