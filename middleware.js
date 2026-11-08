'use strict';

const { version } = require('./package.json');
const { errorMessage } = require('./lib/client');

// The key may only go to Geonode over https, whatever Base URL was entered.
const isGeonodeUrl = (url) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'geonode.io' || hostname.endsWith('.geonode.io'));
  } catch (e) {
    return false;
  }
};

// Attach the API key header to every outbound request. Runs for the auth test
// and all action/trigger requests.
const addApiKeyHeader = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.apiKey) {
    if (!isGeonodeUrl(request.url)) {
      throw new z.errors.Error(
        'The Base URL must be an https address on geonode.io, such as https://scraper.geonode.io.',
        'InvalidBaseUrl',
        400,
      );
    }
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

// Turn API error responses into actionable messages. We leave 5xx alone so
// lib/client.js can back off and retry; Zapier handles 429 before this runs.
const handleErrors = (response, z) => {
  if (response.status >= 500 && response.status < 600) {
    return response;
  }
  if (response.status >= 400) {
    throw new z.errors.Error(
      `Scraper API error (${response.status}): ${errorMessage(response)}`,
      'ScraperApiError',
      response.status,
    );
  }
  return response;
};

module.exports = { addApiKeyHeader, addClientHeader, handleErrors, isGeonodeUrl };
