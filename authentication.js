'use strict';

const { baseUrl, DEFAULT_BASE_URL } = require('./lib/client');

// Custom (session-less) auth: the user supplies the deployment base URL and an
// API key. The key is sent as the X-Api-Key header on every request via the
// beforeRequest middleware in index.js, which refuses non-geonode.io hosts.
module.exports = {
  type: 'custom',

  fields: [
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      default: DEFAULT_BASE_URL,
      helpText:
        'Keep `https://scraper.geonode.io` unless Geonode support gives you another address. Only https addresses on geonode.io work. See the [API docs](https://docs.geonode.com/docs/scraper-api).',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText:
        'Sign in to the [Geonode dashboard](https://app.geonode.com/), open **API Keys**, and create a key or copy an existing one.',
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
      return new URL(baseUrl(bundle)).host;
    } catch (e) {
      return 'Geonode';
    }
  },
};
