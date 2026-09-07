'use strict';

const { response } = require('./notify');

const DEFAULT_ALLOWED_ORIGIN = 'https://tacosjaliscovallejo.com';

function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : [DEFAULT_ALLOWED_ORIGIN];
}

function requestOrigin(event) {
  const headers = event.headers || {};
  return headers.origin || headers.Origin || '';
}

function originDenied(event) {
  const origin = requestOrigin(event);
  if (!origin || !allowedOrigins().includes(origin)) {
    return response(403, { ok: false, error: 'forbidden_origin' });
  }
  return null;
}

module.exports = { originDenied, allowedOrigins, requestOrigin };
