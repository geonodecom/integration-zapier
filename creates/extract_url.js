'use strict';

const { request, pruneEmpty, pollUntilComplete, deadlineFromNow, SYNC_TIMEOUT_MS } = require('../lib/client');
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
  const processingMode = input.processing_mode || 'sync';
  const sync = processingMode !== 'async';

  const body = pruneEmpty({
    url: input.url,
    formats: input.formats && input.formats.length ? input.formats : undefined,
    render_js: input.render_js,
    processing_mode: processingMode,
    // The API refuses `timeout` in async mode.
    timeout: sync ? SYNC_TIMEOUT_MS : undefined,
    proxy: buildProxy(input),
    wait_config: buildWaitConfig(input),
  });

  const response = await request(z, bundle, {
    method: 'POST',
    path: '/v1/extract',
    body,
    deadline,
    attemptMs: sync ? SYNC_TIMEOUT_MS : undefined,
  });

  // Sync mode returns the full extraction inline. Nothing more to do.
  if (sync) return response;

  // Async mode returns a job handle. Optionally wait a while for the result.
  if (!input.wait_for_completion) return response;

  const statusUrl = response.status_url || `/v1/extract/${response.job_id}`;
  const job = await pollUntilComplete(z, bundle, { path: statusUrl, deadline });
  return { ...response, ...job };
};

module.exports = {
  key: 'extract_url',
  noun: 'Extraction',
  display: {
    label: 'Extract URL',
    description:
      'Gets the content of one web page as Markdown and/or HTML. Waits up to 20 seconds for the page by default, or starts a job in async mode.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        placeholder: 'https://example.com',
        helpText: 'The page to extract.',
      },
      outputFormatField(['html']),
      renderJsField,
      {
        key: 'processing_mode',
        label: 'Processing Mode',
        type: 'string',
        required: false,
        default: 'sync',
        choices: { sync: 'Sync (wait for result)', async: 'Async (start a job)' },
        helpText:
          'Sync waits up to 20 seconds for the page; a slower page fails and is not charged. Async returns a job ID at once: use it for slow pages, with **Wait for Completion** or the **Job Completed** trigger.',
      },
      ...proxyFields,
      ...waitFields,
      waitForCompletionField(true),
    ],
    perform,
    sample: samples.extractSync,
    outputFields: samples.extractSyncFields,
  },
};
