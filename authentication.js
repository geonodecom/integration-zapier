'use strict';

const { baseUrl } = require('./lib/client');

// Custom (session-less) auth: the user supplies the deployment base URL and an
// API key. The key is sent as the X-Api-Key header on every request via the
// beforeRequest middleware in index.js.
module.exports = {
  type: 'custom',

  fields: [
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      default: 'https://scraper.geonode.io',
      helpText: 'Root URL of your Scraper API deployment, with no trailing slash.',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText:
        'Sent as the X-Api-Key header. Required when the deployment has billing enabled (the default).',
    },
  ],

  // Hits an authenticated v1 endpoint so the key is actually exercised.
  // /health is unauthenticated and would pass even with a bad key.
  test: async (z, bundle) => {
    const response = await z.request({ url: `${baseUrl(bundle)}/v1/statistics` });
    response.throwForStatus();
    return response.data;
  },

  connectionLabel: (z, bundle) => {
    try {
      return new URL(bundle.authData.baseUrl).host;
    } catch (e) {
      return 'Scraper API';
    }
  },
};
