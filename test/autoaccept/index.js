'use strict';
var test = require('tape');

// mock request
require('request');
var mockRequest = function(url, cb) {
  return setImmediate(cb);
};

mockRequest.get = mockRequest;

require.cache[require.resolve('request')].exports = mockRequest;
delete require.cache[require.resolve('../../lib/autoaccept')];
var autoaccept = require('../../lib/autoaccept');

test('Autoaccept parses link', function (t) {
  t.plan(2);
  mockRequest.get = function (url, cb) {
    // url gets passed through
    t.equal('foobar!', url);
    setImmediate(cb);
  };
  autoaccept('<html><body><a href="foobar!"></a></body></html>', function (e) {
      t.error(e, 'error free');
      t.end();
    });
});

test('Autoaccept errors when no link provided', function (t) {
  t.plan(1);
  autoaccept('<html><body></body></html>', function (e) {
      t.ok(e, 'Error when no link provided');
      t.end();
    });
});

test('Cleanup mocks', function (t) {
  delete require.cache[require.resolve('request')];
  delete require.cache[require.resolve('../../lib/autoaccept')];
  t.end();
});
