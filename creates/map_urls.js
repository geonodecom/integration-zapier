'use strict';

const { request, pruneEmpty } = require('../lib/client');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  const body = pruneEmpty({
    url: input.url,
    search: input.search,
    include_subdomains: input.include_subdomains,
    ignore_query_parameters: input.ignore_query_parameters,
  });

  return request(z, bundle, { method: 'POST', path: '/v1/map', body });
};

module.exports = {
  key: 'map_urls',
  noun: 'Map',
  display: {
    label: 'Map URLs',
    description: 'Discover all URLs under a base URL using sitemaps and lightweight crawling.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'Base URL',
        type: 'string',
        required: true,
        placeholder: 'https://example.com',
        helpText: 'The base URL to discover links from.',
      },
      {
        key: 'search',
        label: 'Search Filter',
        type: 'string',
        required: false,
        helpText: 'Case-insensitive substring filter applied to discovered URLs.',
      },
      {
        key: 'include_subdomains',
        label: 'Include Subdomains',
        type: 'boolean',
        required: false,
        default: 'true',
        helpText: 'Probe common sibling subdomains (docs, blog, help, …).',
      },
      {
        key: 'ignore_query_parameters',
        label: 'Ignore Query Parameters',
        type: 'boolean',
        required: false,
        default: 'true',
        helpText: 'Strip query parameters when normalizing discovered URLs.',
      },
    ],
    perform,
    sample: samples.mapResult,
    outputFields: samples.mapFields,
  },
};
