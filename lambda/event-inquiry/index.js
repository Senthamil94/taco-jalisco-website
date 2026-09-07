'use strict';

// OWNER_EMAIL / OWNER_PHONE are env vars — currently set to internal test values (dev@boons.io / +15709834561).
// Swap to tacosjaliscovallejo@gmail.com / +17077314087 in the Lambda console once the flow is confirmed live. No code change needed.

const multipart = require('lambda-multipart-parser');
const { notifyOwner, response } = require('../lib/notify');
const { renderOwnerEmail, SITE_URL } = require('../lib/emailTemplate');
const { originDenied } = require('../lib/allowedOrigin');

const REQUIRED_FIELDS = ['Full Name', 'Email Address', 'Phone Number', 'Event Type', 'Event Date', 'Number of Guests'];

exports.handler = async (event) => {
  if (event.requestContext?.http?.method !== 'POST') {
    return response(405, { ok: false, error: 'method_not_allowed' });
  }

  const denied = originDenied(event);
  if (denied) return denied;

  const fields = await multipart.parse(event);

  // Honeypot: bots fill every field including hidden ones. Silently no-op.
  if (fields._honey) {
    return response(200, { ok: true });
  }

  const missing = REQUIRED_FIELDS.filter((name) => !fields[name]);
  if (missing.length) {
    return response(400, { ok: false, error: 'missing_fields', fields: missing });
  }

  const message = renderOwnerEmail({
    title: 'New Event Inquiry',
    intro: `A new event inquiry was submitted on <a href="${SITE_URL}" style="color:#000;font-weight:bold;">tacosjaliscovallejo.com</a>.`,
    rows: [
      { label: 'Name', value: fields['Full Name'] },
      { label: 'Email', value: fields['Email Address'] },
      { label: 'Phone', value: fields['Phone Number'] },
      { label: 'Event type', value: fields['Event Type'] },
      { label: 'Event date', value: fields['Event Date'] },
      { label: 'Start time', value: fields['Preferred Start Time'] || 'n/a' },
      { label: 'Guests', value: fields['Number of Guests'] },
      { label: 'Message', value: fields['Message'] || 'n/a' },
    ],
  });

  const smsText = `New event inquiry: ${fields['Full Name']} (${fields['Phone Number']}) — ${fields['Event Type']} on ${fields['Event Date']}, ${fields['Number of Guests']} guests.`;

  return notifyOwner({
    subject: 'New event inquiry — Tacos Jalisco',
    message,
    smsText,
  });
};
