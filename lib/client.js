'use strict';

const MAX_RETRY_ATTEMPTS = 5;
const DEFAULT_BACKOFF_MS = 1000;
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];
const DEFAULT_BASE_URL = 'https://scraper.geonode.io';

// Zapier stops an action after 30 seconds, so each step plans to finish in 25.
// Tests shorten these.
const timing = {
  budgetMs: 25000,
  pollIntervalMs: 3000,
  // Longest one ordinary API call is expected to take.
  attemptMs: 5000,
};

// A sync extraction gets this long; the API stops it then and does not bill it.
const SYNC_TIMEOUT_MS = 20000;

const deadlineFromNow = () => Date.now() + timing.budgetMs;

/**
 * Normalize the user-supplied base URL: trim whitespace and drop trailing
 * slashes so we can safely concatenate `/v1/...` paths.
 */
const baseUrl = (bundle) => String(bundle.authData.baseUrl || '').trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a Retry-After header value (either delta-seconds or an HTTP date)
 * into milliseconds, or null when it cannot be interpreted.
 */
const parseRetryAfter = (value) => {
  if (value == null) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const dateMs = Date.parse(String(value));
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
};

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Recursively drop undefined, null, empty strings, empty arrays, and empty
 * objects so call sites can build request bodies declaratively. Booleans and
 * the number 0 are preserved.
 */
const pruneEmpty = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim().length === 0) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out[k] = v;
      continue;
    }
    if (isPlainObject(v)) {
      const pruned = pruneEmpty(v);
      if (Object.keys(pruned).length === 0) continue;
      out[k] = pruned;
      continue;
    }
    out[k] = v;
  }
  return out;
};

/**
 * Single entry point for every Scraper API call. Handles auth headers
 * (added by the beforeRequest middleware), absolute-URL construction, and
 * automatic retry with backoff on 5xx responses.
 *
 * A retry happens only when its wait plus `attemptMs` still ends before
 * `deadline`. Zapier itself turns a 429 into a ThrottledError and runs the
 * step again later. Returns the parsed JSON body; other 4xx responses are
 * thrown by the afterResponse middleware.
 */
const request = async (
  z,
  bundle,
  { method = 'GET', path, body, params, deadline = deadlineFromNow(), attemptMs = timing.attemptMs } = {},
) => {
  const url = /^https?:\/\//i.test(path) ? path : `${baseUrl(bundle)}${path}`;

  for (let attempt = 1; ; attempt++) {
    // Zapier would otherwise throw on 5xx before this loop can retry.
    const response = await z.request({
      method,
      url,
      params: params ? pruneEmpty(params) : undefined,
      body,
      skipThrowForStatus: true,
    });

    const status = response.status;
    const isRetryable = status >= 500 && status < 600;
    if (isRetryable && attempt < MAX_RETRY_ATTEMPTS) {
      const retryAfterMs =
        parseRetryAfter(response.getHeader && response.getHeader('retry-after')) ??
        DEFAULT_BACKOFF_MS * 2 ** (attempt - 1);
      if (Date.now() + retryAfterMs + attemptMs <= deadline) {
        await sleep(retryAfterMs);
        continue;
      }
    }

    if (status >= 400) {
      throw new z.errors.Error(`Scraper API error (${status}): ${errorMessage(response)}`, 'ScraperApiError', status);
    }
    return response.data;
  }
};

/**
 * Check a job until it finishes or the step runs out of time. Either way it
 * returns the job's latest state, so a slow job gives its ID and status
 * instead of an error.
 */
const pollUntilComplete = async (z, bundle, { path, params, deadline = deadlineFromNow() } = {}) => {
  for (;;) {
    const data = await request(z, bundle, { method: 'GET', path, params, deadline });
    const status = String(data.status || '').toLowerCase();
    if (TERMINAL_STATUSES.includes(status)) return data;
    if (Date.now() + timing.pollIntervalMs + timing.attemptMs > deadline) return data;
    await sleep(timing.pollIntervalMs);
  }
};

/**
 * The most useful text in an API error body. The API answers with FastAPI's
 * `{detail}` (a string, or a list of validation errors), `{code, message}`,
 * or `{error: {code, message}}`.
 */
const errorMessage = (response) => {
  let data = response.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      data = null;
    }
  }
  if (isPlainObject(data)) {
    const { detail } = data;
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] || {};
      const field = Array.isArray(first.loc) ? first.loc.filter((part) => part !== 'body').join('.') : '';
      if (first.msg) return field ? `${field}: ${first.msg}` : first.msg;
      return JSON.stringify(first);
    }
    if (detail) return JSON.stringify(detail);
    if (data.message) return data.message;
    if (isPlainObject(data.error) && data.error.message) return data.error.message;
  }
  return response.content || `Request failed with status ${response.status}`;
};

module.exports = {
  baseUrl,
  pruneEmpty,
  request,
  pollUntilComplete,
  errorMessage,
  deadlineFromNow,
  timing,
  SYNC_TIMEOUT_MS,
  DEFAULT_BASE_URL,
  TERMINAL_STATUSES,
};
