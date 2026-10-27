'use strict';

const { request } = require('../lib/client');
const samples = require('../lib/samples');

// Maps the webhook event type to the corresponding job-list endpoint used by
// performList (for sample data / "test trigger" before any real delivery).
const EVENT_TO_JOB_TYPE = {
  extract_completed: 'extract',
  batch_completed: 'batch',
  crawl_completed: 'crawl',
};

// Registers a webhook in the Scraper API pointing at the Zap's REST hook URL.
// The API responds with the webhook id (used to unsubscribe) and a signing
// secret; both are persisted in bundle.subscribeData.
const subscribeHook = async (z, bundle) => {
  const body = {
    url: bundle.targetUrl,
    event_type: bundle.inputData.event_type,
    description: 'Zapier webhook trigger',
  };
  const data = await request(z, bundle, { method: 'POST', path: '/v1/webhooks', body });
  return data;
};

const unsubscribeHook = async (z, bundle) => {
  const id = bundle.subscribeData && bundle.subscribeData.id;
  if (!id) return {};
  await request(z, bundle, { method: 'DELETE', path: `/v1/webhooks/${id}` });
  return {};
};

// Fired for each inbound webhook delivery. The Scraper API POSTs the completed
// job payload; Zapier hands it to us as bundle.cleanedRequest.body.
const perform = (z, bundle) => {
  const payload = bundle.cleanedRequest && bundle.cleanedRequest.body ? bundle.cleanedRequest.body : bundle.cleanedRequest;
  return [payload];
};

// Backfill / "Test trigger": fetch the most recent completed jobs of the
// matching type so the user has real data to map without waiting for a live
// delivery.
const performList = async (z, bundle) => {
  const jobType = EVENT_TO_JOB_TYPE[bundle.inputData.event_type] || 'extract';
  const data = await request(z, bundle, {
    method: 'GET',
    path: `/v1/${jobType}/jobs`,
    params: { status: 'completed', page: 1, page_size: 3 },
  });
  const jobs = (data && data.jobs) || [];
  return jobs.map((job) => ({ event_type: bundle.inputData.event_type, ...job }));
};

module.exports = {
  key: 'job_completed',
  noun: 'Completed Job',
  display: {
    label: 'Job Completed',
    description:
      'Triggers when an asynchronous extract, batch, or crawl job finishes, delivered instantly via webhook.',
  },
  operation: {
    type: 'hook',
    inputFields: [
      {
        key: 'event_type',
        label: 'Event Type',
        type: 'string',
        required: true,
        default: 'extract_completed',
        choices: {
          extract_completed: 'Extract Completed',
          batch_completed: 'Batch Completed',
          crawl_completed: 'Crawl Completed',
        },
        helpText: 'Which job-completion event should start this Zap.',
      },
    ],
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform,
    performList,
    sample: samples.webhookEvent,
    outputFields: samples.webhookFields,
  },
};
