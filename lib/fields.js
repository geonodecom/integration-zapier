'use strict';

// Shared input-field definitions reused across the create actions. Keeping
// them here ensures the proxy / wait / format choices stay consistent and map
// 1:1 to the Scraper API request schemas.

// `defaultLabel` documents the server-side default (e.g. "html") since Zapier
// list fields can't carry an array default. When the user leaves it blank the
// create action omits `formats` and the API applies its own default.
const outputFormatField = (defaultLabel) => ({
  key: 'formats',
  label: 'Output Formats',
  type: 'string',
  choices: { markdown: 'Markdown', html: 'HTML' },
  list: true,
  required: false,
  helpText: `Which content representations to return. Defaults to ${defaultLabel.join(', ')} when left blank.`,
});

const renderJsField = {
  key: 'render_js',
  label: 'Render JavaScript',
  type: 'boolean',
  required: false,
  default: 'false',
  helpText: 'Use a headless browser to render the page before extracting. Slower, but required for JS-heavy sites.',
};

// Proxy is modelled as two flat fields (Zapier inputs are flat); the create
// actions reassemble them into the nested `proxy` object.
const proxyFields = [
  {
    key: 'proxy_country',
    label: 'Proxy Country',
    type: 'string',
    required: false,
    placeholder: 'US',
    helpText: 'ISO 3166-1 alpha-2 country code for geo-targeting (e.g. US, GB, DE).',
  },
  {
    key: 'proxy_type',
    label: 'Proxy Type',
    type: 'string',
    required: false,
    default: 'residential',
    choices: { residential: 'Residential', datacenter: 'Datacenter', mix: 'Mix' },
  },
];

// WaitConfig group — controls browser wait behaviour. Only meaningful when
// Render JavaScript is enabled. Reassembled into a nested `wait_config` object.
const waitFields = [
  {
    key: 'wait_until',
    label: 'Wait Until',
    type: 'string',
    required: false,
    choices: {
      commit: 'commit',
      domcontentloaded: 'domcontentloaded',
      load: 'load',
      networkidle: 'networkidle',
    },
    helpText: 'Playwright page lifecycle event to wait for. Requires Render JavaScript.',
  },
  {
    key: 'wait_for',
    label: 'Wait For Selector',
    type: 'string',
    required: false,
    placeholder: '.product-price',
    helpText: 'CSS selector or XPath to wait for before capturing. Requires Render JavaScript.',
  },
  {
    key: 'wait_timeout',
    label: 'Wait Timeout (ms)',
    type: 'integer',
    required: false,
    helpText: 'Deliberate pause in milliseconds (0–30000) inserted after the wait condition.',
  },
];

// Waiting is capped below Zapier's 30-second step limit (see lib/client.js).
const waitForCompletionField = (waitDefault) => ({
  key: 'wait_for_completion',
  label: 'Wait for Completion',
  type: 'boolean',
  required: false,
  default: waitDefault ? 'true' : 'false',
  helpText:
    'If yes, the step checks the job for up to 25 seconds, because Zapier stops a step after 30. A job still running by then is returned with its ID and status: get its result later with **Find Job by ID** or the **Job Completed** trigger.',
});

// Build the nested proxy object from flat inputs (or undefined when empty).
const buildProxy = (inputData) => {
  const proxy = {};
  if (inputData.proxy_country) proxy.country = String(inputData.proxy_country).toUpperCase();
  if (inputData.proxy_type) proxy.type = inputData.proxy_type;
  return Object.keys(proxy).length ? proxy : undefined;
};

// Build the nested wait_config object from flat inputs (or undefined).
const buildWaitConfig = (inputData) => {
  const wait = {};
  if (inputData.wait_until) wait.wait_until = inputData.wait_until;
  if (inputData.wait_for) wait.wait_for = inputData.wait_for;
  if (inputData.wait_timeout !== undefined && inputData.wait_timeout !== null && inputData.wait_timeout !== '') {
    wait.wait_timeout = inputData.wait_timeout;
  }
  return Object.keys(wait).length ? wait : undefined;
};

module.exports = {
  outputFormatField,
  renderJsField,
  proxyFields,
  waitFields,
  waitForCompletionField,
  buildProxy,
  buildWaitConfig,
};
