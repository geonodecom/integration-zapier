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
    urls: input.urls,
    ignore_invalid_urls: input.ignore_invalid_urls,
    formats: input.formats && input.formats.length ? input.formats : undefined,
    render_js: input.render_js,
    proxy: buildProxy(input),
    wait_config: buildWaitConfig(input),
  });

  const response = await request(z, bundle, { method: 'POST', path: '/v1/batch', body, deadline });

  // Batch is always async. Optionally wait a while for every URL to finish.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/batch/${response.job_id}`;
  const job = await pollUntilComplete(z, bundle, { path: statusUrl, deadline });
  return { ...response, ...job };
};

module.exports = {
  key: 'batch_scrape',
  noun: 'Batch Job',
  display: {
    label: 'Extract URLs in Batch',
    description:
      'Starts one job that extracts many URLs and returns its job ID. It can also wait up to 25 seconds for the job to finish.',
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
      waitForCompletionField(false),
    ],
    perform,
    sample: samples.batchAccepted,
    outputFields: samples.batchFields,
  },
};
