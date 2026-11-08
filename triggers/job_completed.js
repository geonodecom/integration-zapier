'use strict';

const { request, deadlineFromNow } = require('../lib/client');
const samples = require('../lib/samples');

// Maps the webhook event type to its job type, which names the job's endpoints.
const EVENT_TO_JOB_TYPE = {
  extract_completed: 'extract',
  batch_completed: 'batch',
  crawl_completed: 'crawl',
};

// The batch and crawl webhooks carry these counts instead of per-URL results.
const COUNT_KEYS = {
  batch: ['total_urls', 'completed_urls', 'failed_urls', 'cancelled_urls', 'pending_urls'],
  crawl: ['total_pages', 'completed_pages', 'failed_pages', 'cancelled_pages'],
};

const jobTypeFor = (eventType) => EVENT_TO_JOB_TYPE[eventType] || 'extract';

// One shape for live deliveries and "Test trigger" data, as Zapier requires.
// `id` is the job ID, which both have.
const toResult = (eventType, job, delivery = {}) => ({
  id: job.job_id,
  event_type: eventType,
  ...job,
  status_url: job.status_url || `/v1/${jobTypeFor(eventType)}/${job.job_id}`,
  ...delivery,
});

// Rebuild what the webhook sends from the job's own endpoint.
const asWebhookData = (jobType, job) => {
  if (jobType === 'extract') {
    // The webhook leaves out an empty wait_config.
    if (job.metadata && job.metadata.wait_config == null) {
      const metadata = { ...job.metadata };
      delete metadata.wait_config;
      return { ...job, metadata };
    }
    return job;
  }
  return {
    job_id: job.job_id,
    status: job.status,
    counts: Object.fromEntries(COUNT_KEYS[jobType].map((key) => [key, job[key]])),
    status_url: `/v1/${jobType}/${job.job_id}`,
  };
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

// Fired for each inbound webhook delivery. The Scraper API POSTs an envelope,
// {event, webhook_id, delivery_id, timestamp, data}, with the job in `data`.
const perform = (z, bundle) => {
  const payload = bundle.cleanedRequest && bundle.cleanedRequest.body ? bundle.cleanedRequest.body : bundle.cleanedRequest;
  const eventType = (payload && payload.event) || bundle.inputData.event_type;
  if (!payload || payload.data === undefined || payload.delivery_id === undefined) {
    return [toResult(eventType, payload || {})];
  }
  return [
    toResult(eventType, payload.data || {}, {
      webhook_id: payload.webhook_id,
      delivery_id: payload.delivery_id,
      delivered_at: payload.timestamp,
    }),
  ];
};

// Backfill / "Test trigger": the most recent completed jobs of the matching
// type, in the same shape as a delivery, so fields map the same way.
const performList = async (z, bundle) => {
  const eventType = bundle.inputData.event_type || 'extract_completed';
  const jobType = jobTypeFor(eventType);
  const deadline = deadlineFromNow();
  const data = await request(z, bundle, {
    method: 'GET',
    path: `/v1/${jobType}/jobs`,
    params: { status: 'completed', page: 1, page_size: 3 },
    deadline,
  });
  const jobs = (data && data.jobs) || [];
  // The list holds summaries, so read each job in full.
  const params = jobType === 'extract' ? undefined : { page: 1, page_size: 1 };
  const details = await Promise.all(
    jobs.map((job) => request(z, bundle, { method: 'GET', path: `/v1/${jobType}/${job.job_id}`, params, deadline })),
  );
  return details.map((job) => toResult(eventType, asWebhookData(jobType, job)));
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
    outputFields: [
      ...samples.webhookFields,
      (z, bundle) => samples.webhookFieldsByEvent[bundle.inputData.event_type] || samples.webhookFieldsByEvent.extract_completed,
    ],
  },
};
