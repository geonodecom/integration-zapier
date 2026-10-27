'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { pruneEmpty } = require('../lib/client');
const { buildProxy, buildWaitConfig } = require('../lib/fields');

test('pruneEmpty drops empties but keeps false and 0', () => {
  const out = pruneEmpty({
    a: 'x',
    b: '',
    c: null,
    d: undefined,
    e: [],
    f: ['v'],
    g: {},
    h: { n: 1 },
    bool: false,
    zero: 0,
  });
  assert.deepStrictEqual(out, { a: 'x', f: ['v'], h: { n: 1 }, bool: false, zero: 0 });
});

test('buildProxy uppercases country and omits when empty', () => {
  assert.deepStrictEqual(buildProxy({ proxy_country: 'us', proxy_type: 'datacenter' }), {
    country: 'US',
    type: 'datacenter',
  });
  assert.strictEqual(buildProxy({}), undefined);
});

test('buildWaitConfig assembles only provided fields', () => {
  assert.deepStrictEqual(buildWaitConfig({ wait_until: 'load', wait_timeout: 500 }), {
    wait_until: 'load',
    wait_timeout: 500,
  });
  assert.strictEqual(buildWaitConfig({ wait_timeout: '' }), undefined);
});
