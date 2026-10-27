'use strict';

const MAX_RETRY_ATTEMPTS = 5;
const DEFAULT_BACKOFF_MS = 1000;
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

/**
 * Normalize the user-supplied base URL: trim whitespace and drop trailing
 * slashes so we can safely concatenate `/v1/...` paths.
 */
const baseUrl = (bundle) => String(bundle.authData.baseUrl || '').trim().replace(/\/+$/, '');

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
 * automatic retry with backoff on 429 / 5xx responses.
 *
 * Returns the parsed JSON body. Non-2xx responses are surfaced as errors by
 * the afterResponse middleware before we get here.
 */
const request = async (z, bundle, { method = 'GET', path, body, params } = {}) => {
  const url = /^https?:\/\//i.test(path) ? path : `${baseUrl(bundle)}${path}`;

  for (let attempt = 1; ; attempt++) {
    const response = await z.request({
      method,
      url,
      params: params ? pruneEmpty(params) : undefined,
      body,
    });

    const status = response.status;
    const isRetryable = status === 429 || (status >= 500 && status < 600);
    if (isRetryable && attempt < MAX_RETRY_ATTEMPTS) {
      const retryAfterMs =
        parseRetryAfter(response.getHeader && response.getHeader('retry-after')) ??
        DEFAULT_BACKOFF_MS * 2 ** (attempt - 1);
      await sleep(retryAfterMs);
      continue;
    }

    response.throwForStatus();
    return response.data;
  }
};

/**
 * Poll a job status endpoint until it reaches a terminal state or the timeout
 * elapses. Used by the "wait for completion" options on crawl/batch creates.
 */
const pollUntilComplete = async (z, bundle, { path, params, intervalMs = 5000, timeoutMs = 600000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await request(z, bundle, { method: 'GET', path, params });
    const status = String(data.status || '').toLowerCase();
    if (TERMINAL_STATUSES.includes(status)) return data;
    if (Date.now() > deadline) {
      throw new z.errors.Error(
        `Polling timed out after ${timeoutMs}ms (last status: ${status || 'unknown'})`,
        'PollTimeout',
      );
    }
    await sleep(intervalMs);
  }
};

module.exports = {
  baseUrl,
  pruneEmpty,
  request,
  pollUntilComplete,
  TERMINAL_STATUSES,
};
