'use strict';
/*
var test = require('tape');
var Heroku = require('../../lib/heroku');
var request = require('request');

test('Heroku handles retry logic', function (t) {
  var h = Heroku('foo', 'bar', 'url');
  t.plan(7);

  var invoked = 0;
  request.get = function (opts, cb) {
    t.pass(`Invoked mock ${++invoked} times`);
    if(invoked === 1) { return cb(new Error('foo')); }
    if(invoked === 2) { return cb(null, { statusCode: 404 }); }
    if(invoked === 3) { return cb(null, { statusCode: 401 }); }
    if(invoked === 4) { return cb(null, { statusCode: 201 }); }
    if(invoked === 5) { return cb(null, { statusCode: 200 }); }
    return cb(
      null,
      { statusCode: 200 },
      { owner_email: 'foobar' }
    );
  };

  h.getEmail('buzz', function (e) {
    t.error(e, 'succeeded');
  });
});

test('Cleanup mocks', function (t) {
  delete require.cache[require.resolve('request')];
  delete require.cache[require.resolve('../../lib/heroku')];
  require('../../lib/heroku');
  require('request');
  t.end();
});
*/
