'use strict';

const { request, pruneEmpty, pollUntilComplete, deadlineFromNow } = require('../lib/client');
const {
  outputFormatField,
  renderJsField,
  proxyFields,
  waitFields,
  waitForCompletionField,
  buildProxy,
  buildWaitConfig,
} = require('../lib/fields');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const deadline = deadlineFromNow();
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

  const response = await request(z, bundle, { method: 'POST', path: '/v1/crawl', body, deadline });

  // Crawl is always async. Optionally wait a while for it to finish.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/crawl/${response.job_id}`;
  const job = await pollUntilComplete(z, bundle, { path: statusUrl, deadline });
  return { ...response, ...job };
};

module.exports = {
  key: 'crawl_site',
  noun: 'Crawl Job',
  display: {
    label: 'Crawl Site',
    description:
      'Crawls a site from a start URL, following links up to a depth and page limit. Returns the job ID, and can wait up to 25 seconds for the crawl to finish.',
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
      waitForCompletionField(false),
    ],
    perform,
    sample: samples.crawlAccepted,
    outputFields: samples.crawlFields,
  },
};
