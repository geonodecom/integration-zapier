'use strict';

const { request } = require('../lib/client');
const samples = require('../lib/samples');

// One job-status endpoint per job type. Batch and crawl details are paginated.
const JOB_TYPES = {
  extract: { path: (id) => `/v1/extract/${id}`, paginated: false },
  batch: { path: (id) => `/v1/batch/${id}`, paginated: true },
  crawl: { path: (id) => `/v1/crawl/${id}`, paginated: true },
  map: { path: (id) => `/v1/map/${id}`, paginated: false },
};

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const jobType = input.job_type || 'extract';
  const spec = JOB_TYPES[jobType];
  if (!spec) {
    throw new z.errors.Error(`Unknown job type: ${jobType}`, 'BadJobType', 400);
  }

  const params = spec.paginated
    ? { page: input.page || 1, page_size: input.page_size || 100 }
    : undefined;

  try {
    const data = await request(z, bundle, { method: 'GET', path: spec.path(input.job_id), params });
    // Searches must return an array of matches.
    return [data];
  } catch (err) {
    // A missing job is a "no results" search, not an error.
    if (err && err.message && /\(404\)/.test(err.message)) return [];
    throw err;
  }
};

module.exports = {
  key: 'find_job',
  noun: 'Job',
  display: {
    label: 'Find Job by ID',
    description: 'Look up an extract, batch, crawl, or map job by its ID and return its current status and result.',
  },
  operation: {
    inputFields: [
      {
        key: 'job_type',
        label: 'Job Type',
        type: 'string',
        required: true,
        default: 'extract',
        choices: { extract: 'Extract', batch: 'Batch', crawl: 'Crawl', map: 'Map' },
      },
      {
        key: 'job_id',
        label: 'Job ID',
        type: 'string',
        required: true,
        helpText: 'The job ID returned when the job was created.',
      },
      {
        key: 'page',
        label: 'Results Page',
        type: 'integer',
        required: false,
        default: '1',
        helpText: 'For batch/crawl jobs: which page of per-URL/per-page results to return.',
      },
      {
        key: 'page_size',
        label: 'Results Page Size',
        type: 'integer',
        required: false,
        default: '100',
        helpText: 'For batch/crawl jobs: how many results per page (max 100).',
      },
    ],
    perform,
    sample: samples.extractJob,
    outputFields: samples.extractJobFields,
  },
};
