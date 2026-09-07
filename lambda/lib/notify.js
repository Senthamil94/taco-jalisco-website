'use strict';

const { sendEmail, sendSms } = require('./notificationClient');

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function response(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

// Fires email + SMS concurrently. Email delivery decides success/failure of
// the response (matches the forms' existing success/error UI, which only
// understands "it worked" vs "it didn't"); SMS failure is logged, not fatal.
async function notifyOwner({ subject, message, smsText }) {
  const [emailResult, smsResult] = await Promise.allSettled([
    sendEmail({
      toEmail: [process.env.OWNER_EMAIL],
      subject,
      message,
    }),
    sendSms({
      phoneNumber: process.env.OWNER_PHONE,
      country: process.env.OWNER_PHONE_COUNTRY,
      messageText: smsText,
    }),
  ]);

  if (smsResult.status === 'rejected') {
    console.error('SMS notification failed:', smsResult.reason);
  }

  if (emailResult.status === 'rejected') {
    console.error('Email notification failed:', emailResult.reason);
    return response(502, { ok: false, error: 'notification_failed' });
  }

  return response(200, { ok: true });
}

module.exports = { notifyOwner, response };
