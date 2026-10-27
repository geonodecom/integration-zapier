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
  const processingMode = input.processing_mode || 'sync';

  const body = pruneEmpty({
    url: input.url,
    formats: input.formats && input.formats.length ? input.formats : undefined,
    render_js: input.render_js,
    processing_mode: processingMode,
    proxy: buildProxy(input),
    wait_config: buildWaitConfig(input),
  });

  const response = await request(z, bundle, { method: 'POST', path: '/v1/extract', body });

  // Sync mode returns the full extraction inline. Nothing more to do.
  if (processingMode !== 'async') return response;

  // Async mode returns a job handle. Optionally block and poll for the result.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/extract/${response.job_id}`;
  return pollUntilComplete(z, bundle, {
    path: statusUrl,
    intervalMs: input.poll_interval_ms || 2000,
    timeoutMs: input.poll_timeout_ms || 300000,
  });
};

module.exports = {
  key: 'extract_url',
  noun: 'Extraction',
  display: {
    label: 'Extract URL',
    description:
      'Scrape a single URL and return its content as Markdown and/or HTML. Runs synchronously by default; switch to async to enqueue a job.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        placeholder: 'https://example.com',
        helpText: 'The URL to scrape.',
      },
      outputFormatField(['html']),
      renderJsField,
      {
        key: 'processing_mode',
        label: 'Processing Mode',
        type: 'string',
        required: false,
        default: 'sync',
        choices: { sync: 'Sync (wait for result)', async: 'Async (enqueue job)' },
        helpText: 'Sync blocks until the content is ready. Async returns a job ID immediately.',
      },
      ...proxyFields,
      ...waitFields,
      ...pollFields(true),
    ],
    perform,
    sample: samples.extractSync,
    outputFields: samples.extractSyncFields,
  },
};
