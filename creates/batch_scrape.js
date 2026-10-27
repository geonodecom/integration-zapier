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
    urls: input.urls,
    ignore_invalid_urls: input.ignore_invalid_urls,
    formats: input.formats && input.formats.length ? input.formats : undefined,
    render_js: input.render_js,
    proxy: buildProxy(input),
    wait_config: buildWaitConfig(input),
  });

  const response = await request(z, bundle, { method: 'POST', path: '/v1/batch', body });

  // Batch is always async. Optionally poll the job until every URL is done.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/batch/${response.job_id}`;
  return pollUntilComplete(z, bundle, {
    path: statusUrl,
    intervalMs: input.poll_interval_ms || 5000,
    timeoutMs: input.poll_timeout_ms || 600000,
  });
};

module.exports = {
  key: 'batch_scrape',
  noun: 'Batch Job',
  display: {
    label: 'Batch Scrape URLs',
    description:
      'Submit many URLs in one batch extraction job. Returns a job handle; optionally wait for the whole batch to finish.',
  },
  operation: {
    inputFields: [
      {
        key: 'urls',
        label: 'URLs',
        type: 'string',
        required: true,
        list: true,
        helpText: 'The URLs to extract in one batch.',
      },
      {
        key: 'ignore_invalid_urls',
        label: 'Ignore Invalid URLs',
        type: 'boolean',
        required: false,
        default: 'true',
        helpText: 'If yes, invalid URLs are skipped and reported instead of failing the request.',
      },
      outputFormatField(['markdown']),
      renderJsField,
      ...proxyFields,
      ...waitFields,
      ...pollFields(false),
    ],
    perform,
    sample: samples.batchAccepted,
    outputFields: samples.batchFields,
  },
};
