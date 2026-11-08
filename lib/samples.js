'use strict';

// Sample payloads + output field definitions for every operation. Zapier
// requires both so downstream steps can map fields before any live run.
// Samples mirror the real Scraper API response shapes.

const extractSync = {
  data: {
    html: '<html>...</html>',
    markdown: '# Example\nContent here.',
  },
  metadata: {
    url: 'https://example.com',
    render_js: true,
    http_status: 200,
    duration_ms: 842,
    processing_mode: 'sync',
    formats: ['html', 'markdown'],
  },
  tokens_charged: 1,
};

const extractSyncFields = [
  { key: 'data__html', label: 'HTML' },
  { key: 'data__markdown', label: 'Markdown' },
  { key: 'metadata__url', label: 'URL' },
  { key: 'metadata__http_status', label: 'HTTP Status', type: 'integer' },
  { key: 'metadata__duration_ms', label: 'Duration (ms)', type: 'integer' },
  { key: 'metadata__processing_mode', label: 'Processing Mode' },
  { key: 'tokens_charged', label: 'Tokens Charged', type: 'integer' },
];

const extractAsync = {
  job_id: 'f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  status: 'queued',
  status_url: '/v1/extract/f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  estimated_tokens: 1,
};

const extractAsyncFields = [
  { key: 'job_id', label: 'Job ID' },
  { key: 'status', label: 'Status' },
  { key: 'status_url', label: 'Status URL' },
  { key: 'estimated_tokens', label: 'Estimated Tokens', type: 'integer' },
];

const extractJob = {
  job_id: 'f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  status: 'completed',
  created_at: '2026-05-22T12:00:00Z',
  completed_at: '2026-05-22T12:00:04Z',
  data: { html: '<html>...</html>', markdown: '# Hello' },
  metadata: {
    url: 'https://example.com',
    render_js: true,
    http_status: 200,
    duration_ms: 842,
    processing_mode: 'async',
    formats: ['html'],
  },
  tokens_charged: 1,
};

const extractJobFields = [
  { key: 'job_id', label: 'Job ID' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created At' },
  { key: 'completed_at', label: 'Completed At' },
  { key: 'data__html', label: 'HTML' },
  { key: 'data__markdown', label: 'Markdown' },
  { key: 'tokens_charged', label: 'Tokens Charged', type: 'integer' },
];

const batchAccepted = {
  job_id: 'b1234567-89ab-cdef-0123-456789abcdef',
  status: 'queued',
  status_url: '/v1/batch/b1234567-89ab-cdef-0123-456789abcdef',
  accepted_urls: 5,
  invalid_urls: [],
};

const batchStatus = {
  job_id: 'b1234567-89ab-cdef-0123-456789abcdef',
  status: 'completed',
  token_summary: { tokens_charged_total: 5, tokens_reserved: 0 },
  total_urls: 5,
  completed_urls: 5,
  failed_urls: 0,
  cancelled_urls: 0,
  pending_urls: 0,
  invalid_urls: [],
  created_at: '2026-05-22T12:00:00Z',
  completed_at: '2026-05-22T12:00:18Z',
  results: [
    {
      url: 'https://example.com/a',
      status: 'completed',
      data: { markdown: '# Page A' },
      metadata: { http_status: 200, duration_ms: 540, tokens_charged: 1 },
    },
  ],
};

const batchFields = [
  { key: 'job_id', label: 'Job ID' },
  { key: 'status', label: 'Status' },
  { key: 'status_url', label: 'Status URL' },
  { key: 'accepted_urls', label: 'Accepted URLs', type: 'integer' },
  { key: 'total_urls', label: 'Total URLs', type: 'integer' },
  { key: 'completed_urls', label: 'Completed URLs', type: 'integer' },
  { key: 'failed_urls', label: 'Failed URLs', type: 'integer' },
  { key: 'created_at', label: 'Created At' },
  { key: 'completed_at', label: 'Completed At' },
];

const crawlAccepted = {
  job_id: '0e7c6e2a-1234-4abc-9def-5678901234ab',
  url: 'https://example.com',
  status: 'queued',
  status_url: '/v1/crawl/0e7c6e2a-1234-4abc-9def-5678901234ab',
  estimated_pages: 50,
};

const crawlStatus = {
  job_id: '0e7c6e2a-1234-4abc-9def-5678901234ab',
  url: 'https://example.com',
  status: 'completed',
  token_summary: { tokens_charged_total: 20, tokens_reserved: 0 },
  total_pages: 20,
  completed_pages: 20,
  failed_pages: 0,
  cancelled_pages: 0,
  created_at: '2026-05-22T12:00:00Z',
  completed_at: '2026-05-22T12:02:30Z',
  results: [
    {
      url: 'https://example.com/about',
      parent_url: 'https://example.com',
      depth: 1,
      status: 'completed',
      links: ['https://example.com/team'],
      data: { markdown: '# About' },
      metadata: { http_status: 200, duration_ms: 712, tokens_charged: 1 },
    },
  ],
};

const crawlFields = [
  { key: 'job_id', label: 'Job ID' },
  { key: 'url', label: 'Seed URL' },
  { key: 'status', label: 'Status' },
  { key: 'status_url', label: 'Status URL' },
  { key: 'estimated_pages', label: 'Estimated Pages', type: 'integer' },
  { key: 'total_pages', label: 'Total Pages', type: 'integer' },
  { key: 'completed_pages', label: 'Completed Pages', type: 'integer' },
  { key: 'failed_pages', label: 'Failed Pages', type: 'integer' },
  { key: 'created_at', label: 'Created At' },
  { key: 'completed_at', label: 'Completed At' },
];

const mapResult = {
  success: true,
  warning: null,
  links: [
    { url: 'https://example.com/about', source: 'sitemap' },
    { url: 'https://example.com/blog', source: 'crawl' },
  ],
};

const mapFields = [
  { key: 'success', label: 'Success', type: 'boolean' },
  { key: 'warning', label: 'Warning' },
  { key: 'links[]url', label: 'Link URL' },
  { key: 'links[]source', label: 'Link Source' },
];

const mapJobDetail = {
  job_id: 'a2222222-0000-4000-8000-000000000002',
  url: 'https://example.com',
  status: 'completed',
  include_subdomains: true,
  ignore_query_parameters: true,
  search: null,
  links_count: 2,
  tokens_charged: 1,
  duration_ms: 1200,
  created_at: '2026-05-22T12:00:00Z',
  completed_at: '2026-05-22T12:00:01Z',
  links: [{ url: 'https://example.com/about', source: 'sitemap' }],
};

const mapJobFields = [
  { key: 'job_id', label: 'Job ID' },
  { key: 'url', label: 'URL' },
  { key: 'status', label: 'Status' },
  { key: 'links_count', label: 'Links Count', type: 'integer' },
  { key: 'tokens_charged', label: 'Tokens Charged', type: 'integer' },
  { key: 'created_at', label: 'Created At' },
  { key: 'completed_at', label: 'Completed At' },
];

// Only the keys every event has, because Zapier checks that the sample's keys
// appear in each live result, whatever event the Zap uses.
const webhookEvent = {
  id: 'f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  event_type: 'extract_completed',
  job_id: 'f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  status: 'completed',
  status_url: '/v1/extract/f0e3f6a4-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
};

const webhookFields = [
  { key: 'event_type', label: 'Event Type' },
  { key: 'job_id', label: 'Job ID' },
  { key: 'status', label: 'Status' },
  { key: 'status_url', label: 'Status URL' },
  { key: 'delivered_at', label: 'Delivered At' },
  { key: 'delivery_id', label: 'Delivery ID' },
];

// The rest of each event's fields, shown for the event the Zap picks.
const webhookFieldsByEvent = {
  extract_completed: [
    { key: 'created_at', label: 'Created At' },
    { key: 'completed_at', label: 'Completed At' },
    { key: 'data__markdown', label: 'Markdown' },
    { key: 'data__html', label: 'HTML' },
    { key: 'metadata__url', label: 'URL' },
    { key: 'metadata__http_status', label: 'HTTP Status', type: 'integer' },
    { key: 'tokens_charged', label: 'Tokens Charged', type: 'integer' },
    { key: 'error__code', label: 'Error Code' },
    { key: 'error__message', label: 'Error Message' },
  ],
  batch_completed: [
    { key: 'counts__total_urls', label: 'Total URLs', type: 'integer' },
    { key: 'counts__completed_urls', label: 'Completed URLs', type: 'integer' },
    { key: 'counts__failed_urls', label: 'Failed URLs', type: 'integer' },
    { key: 'counts__cancelled_urls', label: 'Cancelled URLs', type: 'integer' },
    { key: 'counts__pending_urls', label: 'Pending URLs', type: 'integer' },
  ],
  crawl_completed: [
    { key: 'counts__total_pages', label: 'Total Pages', type: 'integer' },
    { key: 'counts__completed_pages', label: 'Completed Pages', type: 'integer' },
    { key: 'counts__failed_pages', label: 'Failed Pages', type: 'integer' },
    { key: 'counts__cancelled_pages', label: 'Cancelled Pages', type: 'integer' },
  ],
};

module.exports = {
  extractSync,
  extractSyncFields,
  extractAsync,
  extractAsyncFields,
  extractJob,
  extractJobFields,
  batchAccepted,
  batchStatus,
  batchFields,
  crawlAccepted,
  crawlStatus,
  crawlFields,
  mapResult,
  mapFields,
  mapJobDetail,
  mapJobFields,
  webhookEvent,
  webhookFields,
  webhookFieldsByEvent,
};
