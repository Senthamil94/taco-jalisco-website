'use strict';

// OWNER_EMAIL / OWNER_PHONE are env vars — currently set to internal test values (dev@boons.io / +15709834561).
// Swap to tacosjaliscovallejo@gmail.com / +17077314087 in the Lambda console once the flow is confirmed live. No code change needed.

const multipart = require('lambda-multipart-parser');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { notifyOwner, response } = require('../lib/notify');
const { renderOwnerEmail, SITE_URL } = require('../lib/emailTemplate');
const { originDenied } = require('../lib/allowedOrigin');

const REQUIRED_FIELDS = ['Position', 'Name', 'Email', 'Phone'];
const RESUME_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — long enough for the owner to open it, private bucket regardless

const s3 = new S3Client({});

async function uploadResume(file) {
  const key = `resumes/${Date.now()}-${file.filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.RESUME_S3_BUCKET,
    Key: key,
    Body: file.content,
    ContentType: file.contentType,
  }));
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.RESUME_S3_BUCKET, Key: key }), {
    expiresIn: RESUME_URL_TTL_SECONDS,
  });
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method !== 'POST') {
    return response(405, { ok: false, error: 'method_not_allowed' });
  }

  const denied = originDenied(event);
  if (denied) return denied;

  const parsed = await multipart.parse(event);

  // Honeypot: bots fill every field including hidden ones. Silently no-op.
  if (parsed._honey) {
    return response(200, { ok: true });
  }

  const missing = REQUIRED_FIELDS.filter((name) => !parsed[name]);
  if (missing.length) {
    return response(400, { ok: false, error: 'missing_fields', fields: missing });
  }

  const resumeFile = (parsed.files || []).find((f) => f.fieldname === 'Resume' && f.content?.length);
  const hasComment = !!(parsed.Comment && parsed.Comment.trim());
  if (!hasComment && !resumeFile) {
    return response(400, { ok: false, error: 'comment_or_resume_required' });
  }

  const resumeUrl = resumeFile ? await uploadResume(resumeFile) : null;

  const message = renderOwnerEmail({
    title: 'New Job Application',
    intro: `A new application was submitted on <a href="${SITE_URL}" style="color:#000;font-weight:bold;">tacosjaliscovallejo.com</a>.`,
    rows: [
      { label: 'Position', value: parsed.Position },
      { label: 'Name', value: parsed.Name },
      { label: 'Email', value: parsed.Email },
      { label: 'Phone', value: parsed.Phone },
      { label: 'Comment', value: parsed.Comment || 'n/a' },
      resumeUrl
        ? { label: 'Resume', value: `${resumeFile.filename} (link expires in 7 days)`, href: resumeUrl }
        : { label: 'Resume', value: 'not attached' },
    ],
  });

  const smsText = `New job application: ${parsed.Name} for ${parsed.Position} (${parsed.Phone}).`;

  return notifyOwner({
    subject: 'New job application — Tacos Jalisco',
    message,
    smsText,
  });
};
