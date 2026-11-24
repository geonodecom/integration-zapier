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
        'Leave the default unless Geonode support asks you to change it. Your key is sent only to https addresses on geonode.io.',
    },
    {
      key: 'apiKey',
      label: 'API key',
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

  // No connectionLabel: /v1/statistics names no account, and Zapier wants the
  // label to identify one (check D003), so Zapier's default name is used.
};
