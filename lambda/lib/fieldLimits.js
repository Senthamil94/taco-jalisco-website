'use strict';

const MAX_NAME = 50;
const MAX_MESSAGE = 2000;

function overCharLimit(value, max) {
  return typeof value === 'string' && value.length > max;
}

module.exports = { MAX_NAME, MAX_MESSAGE, overCharLimit };
