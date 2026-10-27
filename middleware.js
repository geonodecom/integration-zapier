'use strict';

const { version } = require('./package.json');

// Attach the API key header to every outbound request. Runs for the auth test
// and all action/trigger requests.
const addApiKeyHeader = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.apiKey) {
    request.headers = request.headers || {};
    request.headers['X-Api-Key'] = bundle.authData.apiKey;
  }
  return request;
};

// Zapier owns the User-Agent, so the app names itself in this header instead (scraper-api#674).
const addClientHeader = (request) => {
  request.headers = request.headers || {};
  request.headers['X-Geonode-Client'] = `zapier/${version}`;
  return request;
};

// Turn API error responses into actionable messages. The Scraper API returns
// `{ "detail": ... }` (FastAPI-style) on errors. We leave retryable statuses
// (429 / 5xx) alone so lib/client.js can back off and retry.
const handleErrors = (response, z) => {
  if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
    return response;
  }
  if (response.status >= 400) {
    let detail = response.data && response.data.detail;
    if (detail && typeof detail !== 'string') detail = JSON.stringify(detail);
    const message = detail || response.content || `Request failed with status ${response.status}`;
    throw new z.errors.Error(`Scraper API error (${response.status}): ${message}`, 'ScraperApiError', response.status);
  }
  return response;
};

module.exports = { addApiKeyHeader, addClientHeader, handleErrors };
