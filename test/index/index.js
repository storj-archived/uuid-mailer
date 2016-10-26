var test = require('tape')
var config = require('../../config')
var path = require('path')

// Mock config for tests
var mockConfig = {
  heroku: {
    id: 'foobar',
    password: 'bizzbuzz',
    url: 'http://127.0.0.1:8543'
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
}

require.cache[require.resolve('../../config')].exports = mockConfig
delete require.cache[require.resolve('../../lib/heroku')]
delete require.cache[require.resolve('../../lib/autoaccept')]
delete require.cache[require.resolve('../../lib/receiver')]
delete require.cache[require.resolve('../../lib/sender')]
delete require.cache[require.resolve('../../index.js')]
var index = require('../../index.js')

test('Bootstrap starts and stops server', function (t) {
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

  index(function (e, server) {
    t.ok(e, 'Server fails to start');
    t.end();
  });
});

test('Receiver handles heroku errors gracefully', function (t) {
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, new Error('foobar!'));
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, '', function (e) {
      t.ok(e, 'Handled error')
      t.end();
    })
  })
});

test('Receiver handles invalid SMTP messages', function (t) {
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, path.join(__dirname, 'invalid.txt'), function (e) {
      t.ok(e, 'Handled error')
      t.end();
    })
  })
})

test('Process auto accepts emails', function (t) {
  t.plan(8);
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_accepter = function (html, cb) {
    t.pass('Accepter was called');
    t.ok(html, 'was provided message body');
    setImmediate(cb);
  };
  require('../../lib/autoaccept');
  require.cache[require.resolve('../../lib/autoaccept')].exports =
    mock_accepter;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, path.join(__dirname, 'valid.txt'), function (e) {
      t.error(e, 'does not error')
      t.end();
    })
  })
})

test('Process forwards non-registration emails', function (t) {
  t.plan(7);
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_accepter = function (html, cb) {
    t.fail('Accepter was called instead of sender');
    setImmediate(cb);
  };
  require('../../lib/autoaccept');
  require.cache[require.resolve('../../lib/autoaccept')].exports =
    mock_accepter;
  var mock_sender = function (opts) {
    return {
      _transporter: {
        sendMail: function (opts, cb) {
          t.ok('Called sendmail!');
          setImmediate(cb, null, { messageId: 'foobar!' });
        }
      }
    }
  };
  require('../../lib/sender');
  require.cache[require.resolve('../../lib/sender')].exports =
    mock_sender;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, path.join(__dirname, 'other.txt'), function (e) {
      t.error(e, 'does not error')
      t.end();
    })
  })
})

test('Process handles error when forwarding', function (t) {
  t.plan(7);
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_accepter = function (html, cb) {
    t.fail('Accepter was called instead of sender');
    setImmediate(cb);
  };
  require('../../lib/autoaccept');
  require.cache[require.resolve('../../lib/autoaccept')].exports =
    mock_accepter;
  var mock_sender = function (opts) {
    return {
      _transporter: {
        sendMail: function (opts, cb) {
          t.ok('Called sendmail!');
          setImmediate(cb, new Error('foobar'));
        }
      }
    }
  };
  require('../../lib/sender');
  require.cache[require.resolve('../../lib/sender')].exports =
    mock_sender;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, path.join(__dirname, 'other.txt'), function (e) {
      t.ok(e, 'returns error')
      t.end();
    })
  })
})

test('Index handles autoaccept errors ', function (t) {
  t.plan(8);
  var onEmail = null
  var mock_receiver = function (opts, cb) {
    t.pass('Receiver mock called');
    t.ok(opts.onEmail, 'Was provided email handler');
    onEmail = opts.onEmail
    setImmediate(cb);
  };
  require('../../lib/receiver');
  require.cache[require.resolve('../../lib/receiver')].exports = mock_receiver;
  var mock_accepter = function (html, cb) {
    t.pass('Accepter was called');
    t.ok(html, 'was provided message body');
    setImmediate(cb, new Error('foobar!'));
  };
  require('../../lib/autoaccept');
  require.cache[require.resolve('../../lib/autoaccept')].exports =
    mock_accepter;
  var mock_heroku = function() {
    t.pass('Heroku mock called')
    return {
      getEmail: function (addr, cb) {
        t.pass('Heroku.getEmail mock called');
        return setImmediate(cb, null, 'will@storj.io');
      }
    };
  };
  require('../../lib/heroku');
  require.cache[require.resolve('../../lib/heroku')].exports = mock_heroku;

  delete require.cache[require.resolve('../../index.js')];
  var index = require('../../index.js');

  index(function (e) {
    t.error(e, 'Mock worked')
    onEmail({}, path.join(__dirname, 'valid.txt'), function (e) {
      t.ok(e, 'handles error')
      t.end();
    })
  })
})

test('Cleanup mocks', function (t) {
  delete require.cache[require.resolve('../../lib/receiver')];
  delete require.cache[require.resolve('../../index.js')];
  delete require.cache[require.resolve('../../lib/heroku')];
  require('../../lib/heroku');
  require('../../lib/receiver');
  require('../../index.js');
  t.end();
})
