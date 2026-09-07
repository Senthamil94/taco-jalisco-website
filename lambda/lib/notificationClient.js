'use strict';

const BASE_URL = process.env.NOTIFICATION_API_BASE_URL;

async function post(path, payload) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Contract: boons-notification-api POST /sendEmail
// { toEmail: string[], subject: string, message: string }
function sendEmail({ toEmail, subject, message }) {
  return post('/sendEmail', { toEmail, subject, message });
}

// Contract: boons-notification-api POST /send-message
// { phone_number: string, country: string, messageText: string, user_type: string }
function sendSms({ phoneNumber, country, messageText }) {
  return post('/send-message', {
    phone_number: phoneNumber,
    country,
    messageText,
    user_type: '',
  });
}

module.exports = { sendEmail, sendSms };
