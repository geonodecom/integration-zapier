'use strict';

// Behaviour Zapier's review checks: one shape for webhook, "Test trigger" and
// sample data; every step inside the 30-second limit; the API key sent only
// to Geonode; readable errors.

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const nock = require('nock');

const zapier = require('zapier-platform-core');
const App = require('../index');
const { timing, errorMessage } = require('../lib/client');
const { isGeonodeUrl } = require('../middleware');
const samples = require('../lib/samples');

const appTester = zapier.createAppTester(App);

const BASE = 'https://scraper.geonode.io';
const authData = { baseUrl: BASE, apiKey: 'test-key' };
const defaultTiming = { ...timing };
const trigger = App.triggers.job_completed.operation;

beforeEach(() => {
  timing.pollIntervalMs = 1;
});

afterEach(() => {
  Object.assign(timing, defaultTiming);
  nock.cleanAll();
});

// Zapier compares nested keys, so compare flattened ones.
const flatKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flatKeys(value, `${prefix}${key}__`)
      : [`${prefix}${key}`],
  );

const assertSubset = (small, big, what) => {
  const missing = flatKeys(small).filter((key) => !flatKeys(big).includes(key));
  assert.deepStrictEqual(missing, [], `${what}: keys missing from the live result`);
};

const DELIVERY_KEYS = ['webhook_id', 'delivery_id', 'delivered_at'];

// Shapes copied from scraper-api: app/worker/webhook_worker.py builds the
// envelope, app/core/webhooks/events.py the data.
const extractJob = {
  job_id: 'e-1',
  status: 'completed',
  created_at: '2026-11-08T10:00:00Z',
  completed_at: '2026-11-08T10:00:03Z',
  data: { html: null, markdown: '# Hi' },
  metadata: {
    url: 'https://example.com',
    render_js: false,
    http_status: 200,
    duration_ms: 500,
    formats: ['markdown'],
    proxy: { type: 'residential', country: null },
    processing_mode: 'async',
    headers: null,
  },
  error: null,
  tokens_charged: 1,
};

const envelope = (event, data) => ({
  event,
  webhook_id: 'w-1',
  delivery_id: 'd-1',
  timestamp: '2026-11-08T10:00:04+00:00',
  data,
});

const batchData = {
  job_id: 'b-1',
  status: 'completed',
  counts: { total_urls: 2, completed_urls: 2, failed_urls: 0, cancelled_urls: 0, pending_urls: 0 },
  status_url: '/v1/batch/b-1',
};

const batchStatus = {
  job_id: 'b-1',
  status: 'completed',
  batch_config: {},
  token_summary: { tokens_charged_total: 2, tokens_reserved: 0 },
  total_urls: 2,
  completed_urls: 2,
  failed_urls: 0,
  cancelled_urls: 0,
  pending_urls: 0,
  invalid_urls: [],
  created_at: '2026-11-08T10:00:00Z',
  completed_at: '2026-11-08T10:00:09Z',
  results: [{ url: 'https://example.com', status: 'completed' }],
};

test('a delivery is unwrapped from its envelope and gets an id', async () => {
  const [result] = await appTester(trigger.perform, {
    authData,
    inputData: { event_type: 'extract_completed' },
    cleanedRequest: envelope('extract_completed', extractJob),
  });
  assert.strictEqual(result.id, 'e-1');
  assert.strictEqual(result.event_type, 'extract_completed');
  assert.strictEqual(result.job_id, 'e-1');
  assert.strictEqual(result.status_url, '/v1/extract/e-1');
  assert.strictEqual(result.data.markdown, '# Hi');
  assert.strictEqual(result.delivery_id, 'd-1');
  assert.strictEqual(result.delivered_at, '2026-11-08T10:00:04+00:00');
});

test('Test trigger data has the same keys as an extract delivery', async () => {
  const detail = { ...extractJob, metadata: { ...extractJob.metadata, wait_config: null } };
  nock(BASE)
    .get('/v1/extract/jobs')
    .query({ status: 'completed', page: 1, page_size: 3 })
    .reply(200, { jobs: [{ job_id: 'e-1', status: 'completed', url: 'https://example.com', created_at: 'x' }] })
    .get('/v1/extract/e-1')
    .reply(200, detail);

  const [listed] = await appTester(trigger.performList, { authData, inputData: { event_type: 'extract_completed' } });
  const [live] = await appTester(trigger.perform, {
    authData,
    inputData: { event_type: 'extract_completed' },
    cleanedRequest: envelope('extract_completed', extractJob),
  });
  const liveKeys = flatKeys(live).filter((key) => !DELIVERY_KEYS.includes(key));
  assert.deepStrictEqual(flatKeys(listed).sort(), liveKeys.sort());
});

test('Test trigger data has the same keys as a batch delivery', async () => {
  nock(BASE)
    .get('/v1/batch/jobs')
    .query({ status: 'completed', page: 1, page_size: 3 })
    .reply(200, { jobs: [{ job_id: 'b-1', status: 'completed', accepted_urls: 2, config: {}, created_at: 'x' }] })
    .get('/v1/batch/b-1')
    .query({ page: 1, page_size: 1 })
    .reply(200, batchStatus);

  const [listed] = await appTester(trigger.performList, { authData, inputData: { event_type: 'batch_completed' } });
  const [live] = await appTester(trigger.perform, {
    authData,
    inputData: { event_type: 'batch_completed' },
    cleanedRequest: envelope('batch_completed', batchData),
  });
  assert.deepStrictEqual(listed.counts, batchData.counts);
  const liveKeys = flatKeys(live).filter((key) => !DELIVERY_KEYS.includes(key));
  assert.deepStrictEqual(flatKeys(listed).sort(), liveKeys.sort());
});

test('the trigger sample keys appear in every event type', async () => {
  const crawlData = {
    job_id: 'c-1',
    status: 'completed',
    counts: { total_pages: 3, completed_pages: 3, failed_pages: 0, cancelled_pages: 0 },
    status_url: '/v1/crawl/c-1',
  };
  for (const [event, data] of [
    ['extract_completed', extractJob],
    ['batch_completed', batchData],
    ['crawl_completed', crawlData],
  ]) {
    const [live] = await appTester(trigger.perform, {
      authData,
      inputData: { event_type: event },
      cleanedRequest: envelope(event, data),
    });
    assertSubset(samples.webhookEvent, live, event);
  }
});

test('trigger output fields follow the chosen event', () => {
  const dynamic = trigger.outputFields.find((field) => typeof field === 'function');
  const keys = (event) => dynamic(null, { inputData: { event_type: event } }).map((field) => field.key);
  assert.ok(keys('batch_completed').includes('counts__total_urls'));
  assert.ok(keys('crawl_completed').includes('counts__total_pages'));
  assert.ok(keys('extract_completed').includes('data__markdown'));
});

test('a 503 is retried when the retry fits in the time left', async () => {
  const scope = nock(BASE)
    .post('/v1/map')
    .reply(503, { code: 'SERVICE_UNAVAILABLE', message: 'Try again' }, { 'Retry-After': '0' })
    .post('/v1/map')
    .reply(200, { success: true, links: [] });

  const result = await appTester(App.creates.map_urls.operation.perform, { authData, inputData: { url: 'https://example.com' } });
  assert.strictEqual(result.success, true);
  scope.done();
});

test('a 503 is not retried when the retry would pass the time limit', async () => {
  timing.budgetMs = 1000;
  nock(BASE).post('/v1/map').reply(503, { code: 'SERVICE_UNAVAILABLE', message: 'Try again' }, { 'Retry-After': '1' });

  await assert.rejects(
    appTester(App.creates.map_urls.operation.perform, { authData, inputData: { url: 'https://example.com' } }),
    /Scraper API error \(503\): Try again/,
  );
});

test('a 429 is left to Zapier, which runs the step again later', async () => {
  nock(BASE).post('/v1/map').reply(429, { detail: 'slow down' }, { 'Retry-After': '7' });

  await assert.rejects(
    appTester(App.creates.map_urls.operation.perform, { authData, inputData: { url: 'https://example.com' } }),
    (err) => err.name === 'ThrottledError' && JSON.parse(err.message).delay === 7,
  );
});

test('waiting stops in time and returns the running job', async () => {
  timing.budgetMs = 60;
  timing.attemptMs = 10;
  nock(BASE)
    .post('/v1/batch')
    .reply(202, { job_id: 'b-2', status: 'queued', status_url: '/v1/batch/b-2', accepted_urls: 1, invalid_urls: [] })
    .get('/v1/batch/b-2')
    .times(1000)
    .reply(200, { job_id: 'b-2', status: 'processing', total_urls: 1, completed_urls: 0 });

  const result = await appTester(App.creates.batch_scrape.operation.perform, {
    authData,
    inputData: { urls: ['https://example.com'], wait_for_completion: true },
  });
  assert.strictEqual(result.status, 'processing');
  assert.strictEqual(result.job_id, 'b-2');
  assert.strictEqual(result.status_url, '/v1/batch/b-2');
});

test('sync extract asks the API to stop at 20 seconds; async does not send timeout', async () => {
  const scope = nock(BASE)
    .post('/v1/extract', (body) => body.processing_mode === 'sync' && body.timeout === 20000)
    .reply(200, { data: { markdown: '# Hi' }, metadata: {}, tokens_charged: 1 })
    .post('/v1/extract', (body) => body.processing_mode === 'async' && body.timeout === undefined)
    .reply(202, { job_id: 'e-2', status: 'queued', status_url: '/v1/extract/e-2', estimated_tokens: 1 });

  await appTester(App.creates.extract_url.operation.perform, { authData, inputData: { url: 'https://example.com' } });
  await appTester(App.creates.extract_url.operation.perform, {
    authData,
    inputData: { url: 'https://example.com', processing_mode: 'async', wait_for_completion: false },
  });
  scope.done();
});

test('the API key is sent only to https geonode.io addresses', async () => {
  const evil = nock('https://evil.example.com').get('/v1/statistics').reply(200, {});
  await assert.rejects(
    appTester(App.authentication.test, { authData: { baseUrl: 'https://evil.example.com', apiKey: 'test-key' } }),
    /Base URL must be an https address on geonode\.io/,
  );
  assert.strictEqual(evil.isDone(), false);

  assert.strictEqual(isGeonodeUrl('https://scraper.geonode.io/v1/x'), true);
  assert.strictEqual(isGeonodeUrl('https://geonode.io/v1/x'), true);
  assert.strictEqual(isGeonodeUrl('http://scraper.geonode.io/v1/x'), false);
  assert.strictEqual(isGeonodeUrl('https://scraper.geonode.io.evil.com/v1/x'), false);
  assert.strictEqual(isGeonodeUrl('https://evilgeonode.io/v1/x'), false);
});

test('a blank Base URL falls back to the default address', async () => {
  const scope = nock(BASE).get('/v1/statistics').reply(200, { total_jobs: 1 });
  await appTester(App.authentication.test, { authData: { baseUrl: ' ', apiKey: 'test-key' } });
  scope.done();
});

test('validation errors show the field and the first message', async () => {
  nock(BASE)
    .post('/v1/extract')
    .reply(422, {
      detail: [{ type: 'value_error', loc: ['body', 'url'], msg: 'Value error, URL must contain a valid hostname.' }],
    });

  await assert.rejects(
    appTester(App.creates.extract_url.operation.perform, { authData, inputData: { url: 'not-a-url' } }),
    /Scraper API error \(422\): url: Value error, URL must contain a valid hostname\./,
  );
});

test('errorMessage reads each error shape the API uses', () => {
  assert.strictEqual(errorMessage({ data: { detail: 'Not Found' } }), 'Not Found');
  assert.strictEqual(errorMessage({ data: { code: 'TIMEOUT', message: 'Took too long', retryable: true } }), 'Took too long');
  assert.strictEqual(errorMessage({ data: { error: { code: 'BLOCKED', message: 'Site refused' } } }), 'Site refused');
  assert.strictEqual(errorMessage({ data: '{"detail":"Bad"}' }), 'Bad');
  assert.strictEqual(errorMessage({ data: null, content: '', status: 502 }), 'Request failed with status 502');
});

test('find_job asks for at most 50 batch results, 10 by default', async () => {
  const scope = nock(BASE)
    .get('/v1/batch/b-1')
    .query({ page: 1, page_size: 50 })
    .reply(200, batchStatus)
    .get('/v1/batch/b-1')
    .query({ page: 1, page_size: 10 })
    .reply(200, batchStatus);

  await appTester(App.searches.find_job.operation.perform, {
    authData,
    inputData: { job_type: 'batch', job_id: 'b-1', page_size: 100 },
  });
  await appTester(App.searches.find_job.operation.perform, { authData, inputData: { job_type: 'batch', job_id: 'b-1' } });
  scope.done();
});

test('user-facing text does not say "scrape" (Zapier policy 1.7)', () => {
  // Every string in the definitions except keys, which users never see.
  const texts = [];
  const collect = (value) => {
    if (typeof value === 'string') texts.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        if (key !== 'key') collect(inner);
      }
    }
  };
  const { authentication, triggers, searches, creates } = App;
  collect([authentication.fields, triggers, searches, creates]);
  // Addresses such as scraper.geonode.io are names, not wording.
  const offending = texts.filter((text) => /scrap/i.test(text.replace(/https?:\/\/\S+/g, '')));
  assert.deepStrictEqual(offending, []);
});
