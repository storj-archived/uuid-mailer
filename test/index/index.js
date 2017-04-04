'use strict';
var test = require('tape');
var path = require('path');

// Mock config for tests
var mockConfig = {
  mongo: {
    user: 'foobar',
    pass: 'bizzbuzz',
    url: 'mongodb://127.0.0.1:27017',
    ssl: false
  },
  mailer: {
    host: '127.0.0.1',
    port: 8542,
    secureConnection: false,
    tls: false,
    auth: {}
  },
  receiver: {
    port: 8541,
    host: '127.0.0.1',
    tmpdir: 'storj-mailer'
  }
};

require('../../config');
require.cache[require.resolve('../../config')].exports = mockConfig;
delete require.cache[require.resolve('../../lib/mongo')];
delete require.cache[require.resolve('../../lib/receiver')];
delete require.cache[require.resolve('../../lib/sender')];
delete require.cache[require.resolve('../../index.js')];
require('../../index.js');

test('Bootstrap starts and stops server', function (t) {
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, new Error('foobar!'));
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;
  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');
  index(function (e, server) {
    t.error(e, 'server starts successfully');
    t.ok(server, 'we are returned a server');
    server.receiver.server.close(function (e) {
      // If the tests hang here, it means the server isn't shutting down all
      // of it's active connections
      t.error(e, 'server shuts itself back down');
      t.end();
    });
  });
});

test('Bootstrap gracefully handles errors', function (t) {
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, new Error('foobar!'));
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;
  var mock_receiver = function (opts, cb) {
    t.ok(opts.onError, 'We are provided an error function');
    // call it
    if(opts.onError) { opts.onError(new Error('foobar!')); }
    // Ensure it handles not being provided an error
    if(opts.onError) { t.doesNotThrow(opts.onError); }
    cb(new Error('foobar!'));
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.ok(e, 'Server fails to start');
    t.end();
  });
});

test('Receiver handles mongo errors gracefully', function (t) {
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, new Error('foobar!'));
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    onEmail({}, '', function (e) {
      // We don't expect an error in return, but we do expect that the process
      // won't blow up!
      t.error(e, 'Handled error');
      t.end();
    });
  });
});

test('Receiver handles invalid SMTP messages', function (t) {
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    onEmail({}, path.join(__dirname, 'invalid.txt'), function (e) {
      t.error(e, 'Handled error');
      t.end();
    });
  });
});

test('Process auto accepts emails', function (t) {
  t.plan(6);
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    onEmail({}, path.join(__dirname, 'valid.txt'), function (e) {
      t.error(e, 'does not error');
    });
  });
});

test('Process forwards non-registration emails', function (t) {
  t.plan(7);
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_sender = function () {
    return {
      _transporter: {
        sendMail: function (opts, cb) {
          t.ok('Called sendmail!');
          setImmediate(cb, null, { messageId: 'foobar!' });
        }
      }
    };
  };
  require('../../lib/sender');
  require.cache[require.resolve('../../lib/sender')].exports =
    mock_sender;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    onEmail({}, path.join(__dirname, 'other.txt'), function (e) {
      t.error(e, 'does not error');
    });
  });
});

test('Process handles error when forwarding', function (t) {
  t.plan(7);
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_sender = function () {
    return {
      _transporter: {
        sendMail: function (opts, cb) {
          t.ok('Called sendmail!');
          setImmediate(cb, new Error('foobar'));
        }
      }
    };
  };
  require('../../lib/sender');
  require.cache[require.resolve('../../lib/sender')].exports =
    mock_sender;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    onEmail({}, path.join(__dirname, 'other2.txt'), function (e) {
      // We don't expect an error here, but we do expect that the process wont
      // blow up
      t.error(e, 'returns error');
    });
  });
});

test('Process handles error when reading file from fs', function (t) {
  t.plan(6);
  var onEmail = null;
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail;
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_sender = function () {
    return {
      _transporter: {
        sendMail: function (opts, cb) {
          t.ok('Called sendmail!');
          setImmediate(cb, new Error('foobar'));
        }
      }
    };
  };
  require('../../lib/sender');
  require.cache[require.resolve('../../lib/sender')].exports =
    mock_sender;
  var mock_mongo = function() {
    t.pass('mongo mock called');
    return {
      getEmail: function (addr, cb) {
        t.pass('mongo.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/mongo');
  require.cache[require.resolve('../../lib/mongo')].exports = mock_mongo;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked');
    // We re-read a deleted file
    onEmail({}, path.join(__dirname, 'other.txt'), function (e) {
      // We don't expect an error here, but we do expect that the process wont
      // blow up
      t.error(e, 'returns error');
    });
  });
});

test('Cleanup mocks', function (t) {
  delete require.cache[require.resolve('../../lib/receiver')];
  delete require.cache[require.resolve('../../index.js')];
  delete require.cache[require.resolve('../../lib/mongo')];
  //require('../../lib/mongo');
  require('../../lib/receiver');
  require('../../index.js');
  t.end();
});
