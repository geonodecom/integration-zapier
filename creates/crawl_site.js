'use strict';

const { request, pruneEmpty, pollUntilComplete } = require('../lib/client');
const {
  outputFormatField,
  renderJsField,
  proxyFields,
  waitFields,
  pollFields,
  buildProxy,
  buildWaitConfig,
} = require('../lib/fields');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  const body = pruneEmpty({
    url: input.url,
    depth: input.depth,
    limit: input.limit,
    formats: input.formats && input.formats.length ? input.formats : undefined,
    render_js: input.render_js,
    same_domain_only: input.same_domain_only,
    include_subdomains: input.include_subdomains,
    proxy: buildProxy(input),
    wait_config: buildWaitConfig(input),
  });

  const response = await request(z, bundle, { method: 'POST', path: '/v1/crawl', body });

  // Crawl is always async. Optionally poll until the crawl reaches a terminal state.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/crawl/${response.job_id}`;
  return pollUntilComplete(z, bundle, {
    path: statusUrl,
    intervalMs: input.poll_interval_ms || 5000,
    timeoutMs: input.poll_timeout_ms || 600000,
  });
};

module.exports = {
  key: 'crawl_site',
  noun: 'Crawl Job',
  display: {
    label: 'Crawl Site',
    description:
      'Crawl a site starting from a seed URL, following links up to a depth/page limit. Returns a job handle; optionally wait for the crawl to finish.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'Seed URL',
        type: 'string',
        required: true,
        placeholder: 'https://example.com',
        helpText: 'The URL to start crawling from.',
      },
      {
        key: 'depth',
        label: 'Depth',
        type: 'integer',
        required: false,
        default: '2',
        helpText: 'Maximum link depth from the seed URL (1 = seed page only).',
      },
      {
        key: 'limit',
        label: 'Page Limit',
        type: 'integer',
        required: false,
        default: '50',
        helpText: 'Maximum number of pages to crawl.',
      },
      outputFormatField(['markdown']),
      renderJsField,
      {
        key: 'same_domain_only',
        label: 'Same Domain Only',
        type: 'boolean',
        required: false,
        default: 'true',
        helpText: 'Only follow links that stay on the seed URL’s domain.',
      },
      {
        key: 'include_subdomains',
        label: 'Include Subdomains',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText: 'When Same Domain Only is on, also follow subdomains.',
      },
      ...proxyFields,
      ...waitFields,
      ...pollFields(false),
    ],
    perform,
    sample: samples.crawlAccepted,
    outputFields: samples.crawlFields,
  },
};
