var test = require('tape')
var Receiver = require('../../lib/receiver')
var portfinder = require('portfinder')
var async = require('async')
var net = require('net')
var SmtpConnect = require('smtp-connection')

test('Server starts on provided port', function (t) {
  var _port = null
  var _smtp = null

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB)
  }

  function step2 (port, waterfallCB) {
    _port = port
    Receiver({ port: _port, onEmail: function () { } }, waterfallCB)
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp
    var connection = net.connect({ port: _port })
    connection.on('data', function (data) {
      data = data.toString().split(' ')
      connection.end()
      waterfallCB(null, data)
    })
    connection.on('error', waterfallCB)
  }

  function step4 (data, waterfallCB) {
    t.equal(data[0], '220', 'Received response from SMTP server')
    waterfallCB()
  }

  function step5 (waterfallCB) {
    _smtp.server.close(waterfallCB)
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error')
    if (e) {
      _smtp.server.close()
    }
    t.end()
  })
})

test('Server requires onEmail', function (t) {
  Receiver({}, function (e) {
    t.ok(e, 'Received error')
    console.log(e.message)
    t.end()
  })
})

test('Server invokes onEmail handler', function (t) {
  var _port = null
  var _smtp = null
  var _client = null

  t.plan(2)

  function onEmail (address, path, cb) {
    t.pass('onEmail was invoked!')
    cb()
  }

  function step1 (waterfallCB) {
    portfinder.getPort(waterfallCB)
  }

  function step2 (port, waterfallCB) {
    _port = port
    Receiver({ port: port, onEmail: onEmail }, waterfallCB)
  }

  function step3 (smtp, waterfallCB) {
    _smtp = smtp
    _client = new SmtpConnect({ port: _port, ignoreTLS: true })
    _client.connect(waterfallCB)
  }

  function step4 (waterfallCB) {
    var envelope = {
      from: 'foobar@foobar.net',
      to: 'buzzbazz@buzzbazz.com'
    }

    _client.send(envelope, 'Hey!', waterfallCB)
  }

  // TODO: test that the file was created and has the correct content

  function step5 (info, waterfallCB) {
    _client.close()
    _smtp.server.close(waterfallCB)
  }

  async.waterfall([
    step1,
    step2,
    step3,
    step4,
    step5
  ], function (e) {
    t.error(e, 'Server starts and stops w/o error')
    if (e) {
      _smtp.server.close()
    }
    t.end()
  })
})

