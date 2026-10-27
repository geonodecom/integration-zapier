'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const nock = require('nock');

const zapier = require('zapier-platform-core');
const App = require('../index');

const appTester = zapier.createAppTester(App);

const BASE = 'https://scraper.example.com';
const authData = { baseUrl: BASE, apiKey: 'test-key' };

afterEach(() => {
  nock.cleanAll();
});

test('authentication test hits /v1/statistics with the API key', async () => {
  const scope = nock(BASE, { reqheaders: { 'x-api-key': 'test-key' } })
    .get('/v1/statistics')
    .reply(200, { total_jobs: 10 });

  const response = await appTester(App.authentication.test, { authData });
  assert.strictEqual(response.total_jobs, 10);
  scope.done();
});

test('requests name the app and its version in X-Geonode-Client (scraper-api#674)', async () => {
  const { version } = require('../package.json');
  const reqheaders = { 'x-api-key': 'test-key', 'x-geonode-client': `zapier/${version}` };
  const scope = nock(BASE, { reqheaders })
    .get('/v1/statistics')
    .reply(200, { total_jobs: 10 })
    .post('/v1/map')
    .reply(200, { links: [] });

  await appTester(App.authentication.test, { authData });
  await appTester(App.creates.map_urls.operation.perform, { authData, inputData: { url: 'https://example.com' } });
  scope.done();
});

test('extract_url (sync) posts the request and returns content inline', async () => {
  const scope = nock(BASE)
    .post('/v1/extract', (body) => body.url === 'https://example.com' && body.processing_mode === 'sync')
    .reply(200, { data: { markdown: '# Hi' }, metadata: { http_status: 200 }, tokens_charged: 1 });

  const result = await appTester(App.creates.extract_url.operation.perform, {
    authData,
    inputData: { url: 'https://example.com', processing_mode: 'sync', formats: ['markdown'] },
  });
  assert.strictEqual(result.data.markdown, '# Hi');
  scope.done();
});

test('crawl_site without wait returns the job handle', async () => {
  const scope = nock(BASE)
    .post('/v1/crawl')
    .reply(200, { job_id: 'job-1', status: 'queued', status_url: '/v1/crawl/job-1' });

  const result = await appTester(App.creates.crawl_site.operation.perform, {
    authData,
    inputData: { url: 'https://example.com', wait_for_completion: false },
  });
  assert.strictEqual(result.job_id, 'job-1');
  scope.done();
});

test('crawl_site with wait polls until completion', async () => {
  const scope = nock(BASE)
    .post('/v1/crawl')
    .reply(200, { job_id: 'job-2', status: 'queued', status_url: '/v1/crawl/job-2' })
    .get('/v1/crawl/job-2')
    .reply(200, { job_id: 'job-2', status: 'processing' })
    .get('/v1/crawl/job-2')
    .reply(200, { job_id: 'job-2', status: 'completed', total_pages: 3 });

  const result = await appTester(App.creates.crawl_site.operation.perform, {
    authData,
    inputData: { url: 'https://example.com', wait_for_completion: true, poll_interval_ms: 1 },
  });
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.total_pages, 3);
  scope.done();
});

test('map_urls returns discovered links', async () => {
  const scope = nock(BASE)
    .post('/v1/map')
    .reply(200, { success: true, links: [{ url: 'https://example.com/a', source: 'sitemap' }] });

  const result = await appTester(App.creates.map_urls.operation.perform, {
    authData,
    inputData: { url: 'https://example.com' },
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.links.length, 1);
  scope.done();
});

test('find_job returns an array and treats 404 as no results', async () => {
  nock(BASE).get('/v1/extract/abc').reply(200, { job_id: 'abc', status: 'completed' });
  const found = await appTester(App.searches.find_job.operation.perform, {
    authData,
    inputData: { job_type: 'extract', job_id: 'abc' },
  });
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].job_id, 'abc');

  nock(BASE).get('/v1/extract/missing').reply(404, { detail: 'Not found' });
  const none = await appTester(App.searches.find_job.operation.perform, {
    authData,
    inputData: { job_type: 'extract', job_id: 'missing' },
  });
  assert.deepStrictEqual(none, []);
});

test('job_completed subscribe/unsubscribe register and remove the webhook', async () => {
  const subScope = nock(BASE)
    .post('/v1/webhooks', (body) => body.event_type === 'crawl_completed' && body.url === 'https://hooks.zapier.com/x')
    .reply(201, { id: 'wh-1', secret: 's3cr3t', url: 'https://hooks.zapier.com/x' });

  const sub = await appTester(App.triggers.job_completed.operation.performSubscribe, {
    authData,
    inputData: { event_type: 'crawl_completed' },
    targetUrl: 'https://hooks.zapier.com/x',
  });
  assert.strictEqual(sub.id, 'wh-1');
  subScope.done();

  const unsubScope = nock(BASE).delete('/v1/webhooks/wh-1').reply(204);
  await appTester(App.triggers.job_completed.operation.performUnsubscribe, {
    authData,
    subscribeData: { id: 'wh-1' },
  });
  unsubScope.done();
});

test('job_completed perform unwraps the inbound webhook body', async () => {
  const result = await appTester(App.triggers.job_completed.operation.perform, {
    authData,
    inputData: { event_type: 'extract_completed' },
    cleanedRequest: { body: { job_id: 'x', status: 'completed' } },
  });
  assert.strictEqual(result[0].job_id, 'x');
});

test('job_completed performList backfills recent completed jobs', async () => {
  const scope = nock(BASE)
    .get('/v1/extract/jobs')
    .query({ status: 'completed', page: 1, page_size: 3 })
    .reply(200, { jobs: [{ job_id: 'a' }, { job_id: 'b' }], page: 1, page_size: 3, page_count: 1 });

  const result = await appTester(App.triggers.job_completed.operation.performList, {
    authData,
    inputData: { event_type: 'extract_completed' },
  });
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].event_type, 'extract_completed');
  scope.done();
});
