'use strict';
var test = require('tape');
var Receiver = require('../../lib/receiver');
var portfinder = require('portfinder');
var async = require('async');
var net = require('net');
var SmtpConnect = require('smtp-connection');

test('Server starts on provided port', function (t) {
  var _port = null;
  var _smtp = null;

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB);
  }

  function step2 (port, waterfallCB) {
    _port = port;
    Receiver({ port: _port, onEmail: function () { } }, waterfallCB);
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp;
    var connection = net.connect({ port: _port });
    connection.on('data', function (data) {
      data = data.toString().split(' ');
      connection.end();
      waterfallCB(null, data);
    });
    connection.on('error', waterfallCB);
  }

  function step4 (data, waterfallCB) {
    t.equal(data[0], '220', 'Received response from SMTP server');
    waterfallCB();
  }

  function step5 (waterfallCB) {
    _smtp.server.close(waterfallCB);
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error');
    if (e) {
      _smtp.server.close();
    }
    t.end();
  });
});

test('Server requires onEmail', function (t) {
  Receiver({}, function (e) {
    t.ok(e, 'Received error');
    t.end();
  });
});

test('Server invokes onEmail handler', function (t) {
  var _port = null;
  var _smtp = null;
  var _client = null;

  t.plan(3);

  function onEmail (address, path, cb) {
    t.pass('onEmail was invoked!');
    cb();
  }

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB);
  }

  function step2 (port, waterfallCB) {
    _port = port;
    Receiver({ port: port, onEmail: onEmail }, waterfallCB);
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp;
    _client = new SmtpConnect({ port: _port, ignoreTLS: true });
    _client.connect(waterfallCB);
  }

  function step4 (waterfallCB) {
    var envelope = {
      from: 'foobar@foobar.net',
      to: ['buzzbazz@buzzbazz.com', 'buzzbazz@buzzbizz.com']
    };

    _client.send(envelope, 'Hey!', waterfallCB);
  }

  // TODO: test that the file was created and has the correct content

  function step5 (info, waterfallCB) {
    _client.close();
    _smtp.server.close(waterfallCB);
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error');
    if (e) {
      _smtp.server.close();
    }
    t.end();
  });
});

test('Receiver handles mkdirp error gracefully', function (t) {
  require.cache[require.resolve('mkdirp')].exports = function (v, cb) {
    t.pass('Mock called!');
    cb(new Error('Foobar!'));
  };

  delete require.cache[require.resolve('../../lib/receiver')];
  var Receiver = require('../../lib/receiver');

  Receiver({
    port: '66564',
    onEmail: function () {},
    onError: function () {
      t.fail('Should not be called');
    }
  }, function (e){
    t.ok(e, 'Returns error');
    // Server should never have been started, if the test hangs here, the error
    // was _not_ gracefully handled.
    t.end();
  });
});

test('Cleanup Mocks', function (t) {
  delete require.cache[require.resolve('mkdirp')];
  require('mkdirp');
  delete require.cache[require.resolve('../../lib/receiver')];
  require('../../lib/receiver');
  t.end();
});

var crypto_random_bytes_original = require('crypto').randomBytes;
test('Mapper handles failing crypto gracefully', function (t) {
  var _port = null;
  var _smtp = null;
  var _client = null;

  t.plan(4);

  function onEmail (address, path, cb) {
    t.pass('onEmail was invoked!');
    cb();
  }

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB);
  }

  function step2 (port, waterfallCB) {
    _port = port;
    Receiver({
      port: port,
      onEmail: onEmail,
      onError: function (e) {
        t.pass('onError was invoked');
        t.ok(e, 'onError was given an error');
      }
    }, waterfallCB);
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp;
    _client = new SmtpConnect({ port: _port, ignoreTLS: true });
    _client.connect(waterfallCB);
  }

  function step4 (waterfallCB) {
    var envelope = {
      from: 'foobar@foobar.net',
      to: 'buzzbazz@buzzbazz.com'
    };

    // Mock out the random bytes function call
    require('crypto').randomBytes = function (count, cb) {
      t.pass('Mock crypto was called');
      // Set mock back incase SMTP library needs it
      require('crypto').randomBytes = crypto_random_bytes_original;
      return cb(new Error('Foobar!'));
    };

    _client.send(envelope, 'Hey!', waterfallCB);
  }

  function step5 (info, waterfallCB) {
    _client.close();
    _smtp.server.close(waterfallCB);
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error');
    if (e) {
      _smtp.server.close();
    }
    t.end();
  });
});

test('Receiver doesn\'t require error handler', function (t) {
  var _port = null;
  var _smtp = null;
  var _client = null;

  t.plan(2);

  function onEmail (address, path, cb) {
    t.pass('onEmail was invoked!');
    cb();
  }

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB);
  }

  function step2 (port, waterfallCB) {
    _port = port;
    Receiver({
      port: port,
      onEmail: onEmail
    }, waterfallCB);
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp;
    _client = new SmtpConnect({ port: _port, ignoreTLS: true });
    _client.connect(waterfallCB);
  }

  function step4 (waterfallCB) {
    var envelope = {
      from: 'foobar@foobar.net',
      to: ['buzzbazz@buzzbazz.com', 'buzzbazz@buzzbizz.com']
    };

    // Mock out the random bytes function call
    require('crypto').randomBytes = function (count, cb) {
      t.pass('Mock crypto was called');
      // Set mock back incase SMTP library needs it
      require('crypto').randomBytes = crypto_random_bytes_original;
      return cb(new Error('Foobar!'));
    };

    _client.send(envelope, 'Hey!', waterfallCB);
  }

  function step5 (info, waterfallCB) {
    _client.close();
    _smtp.server.close(waterfallCB);
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error');
    if (e) {
      _smtp.server.close();
    }
    t.end();
  });
});

test('Reset crypto mock', function (t) {
  require('crypto').randomBytes = crypto_random_bytes_original;
  t.end();
});
