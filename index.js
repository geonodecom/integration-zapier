'use strict';

const { version: platformVersion } = require('zapier-platform-core');

const { version } = require('./package.json');
const authentication = require('./authentication');
const { addApiKeyHeader, addClientHeader, handleErrors } = require('./middleware');

const extractUrl = require('./creates/extract_url');
const batchScrape = require('./creates/batch_scrape');
const crawlSite = require('./creates/crawl_site');
const mapUrls = require('./creates/map_urls');
const findJob = require('./searches/find_job');
const jobCompleted = require('./triggers/job_completed');

module.exports = {
  version,
  platformVersion,

  authentication,

  beforeRequest: [addApiKeyHeader, addClientHeader],
  afterResponse: [handleErrors],

  triggers: {
    [jobCompleted.key]: jobCompleted,
  },

  searches: {
    [findJob.key]: findJob,
  },

  creates: {
    [extractUrl.key]: extractUrl,
    [batchScrape.key]: batchScrape,
    [crawlSite.key]: crawlSite,
    [mapUrls.key]: mapUrls,
  },

  resources: {},
};
