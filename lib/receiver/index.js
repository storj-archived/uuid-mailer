/*
 * lib/receiver/index.js
 *
 * This library provides a simple interface for an application to receive and
 * process emails.
 *
 * We export a single function which acts as an async constructor of the form:
 *
 * Receiver (opts, cb)
 *
 * cb is an error first callback which is invoked when the server is either
 * listening or failed to start
 *
 * opts is a configuration object of the form (values listed are defaults):
 *
 * {
 *   port: 25, // what port to bind the SMTP server to
 *   host: '0.0.0.0', // what interface to bind the SMTP server to
 *   onEmail: [REQUIRED FUNCTION], // invoked when the server receives an email
 *   onError: function () {} // invoked when the server encounters an error
 * }
 */

// SMTPServer provides us with a simple mail server that lets us receive and
// process emails in Node.js
var SMTPServer = require('smtp-server').SMTPServer
// email-addresses allows us to parse the email addresses of an email's
// recipients into their individual components. I.E. "name" local@domain
var address = require('email-addresses')
// We are using the fs module to cache the message body of a received email to
// disk so that other parts of the application can use it
var fs = require('fs')
// crypto is used to generate random file names when caching messages
var crypto = require('crypto')
// We use os to get a path to the standard temp directory on the user's
// platform so we know where it is safe to cache messages
var os = require('os')
// We use path to join the temporary directory returned from os with the
// random path we generate with crypto
var path = require('path')
// We use mkdirp to ensure the temporary directory exists
var mkdirp = require('mkdirp')
// dev-null allows us to drain an incomming smtp pipe in the event of an error,
// allowing the smtp-server module to flush all i/o and handle the connection
// gradefully
var devnull = require('dev-null')
// We use bole for logging
var log = require('bole')('receiver')

function Receiver (opts, callback) {
  // If someone invokes our constructor without the "new" keyword, we can be
  // nice and convert the call for them
  if (!(this instanceof Receiver)) {
    return new Receiver(opts, callback)
  }

  // We provide a set of defaults for our server in case they aren't provided
  // by the user
  var defaults = {
    port: 25,
    host: '0.0.0.0',
    tmpdir: 'storj-mailer',
    onError: function noop () {}
  }

  // Merge the default options with the user provided options
  this.opts = Object.assign(defaults, opts)

  // Define an array of required options, then check to see if the user
  // provided them
  var requiredOpts = ['onEmail']
  for (var i = 0; i < requiredOpts.length; i++) {
    // If one of the required options wasn't provided, return an error and stop
    // execution of this constructor
    if (opts[requiredOpts[i]] === undefined) {
      var e = new Error(`Receiver requires the ${requiredOpts[i]} option`)
      return callback(e)
    }
  }

  // Time to start the SMTP server, but first we need to configure it
  var serverOpts = {}
  // We start by making auth optional, allowing email providers like gmail and
  // yahoo to send our service emails
  serverOpts.authOptional = true

  // Next, we take the onData function below, and set it's `this` object to the
  // `this` in this constructor. This allows onData to access the opts object
  // we created above. onData will be invoked whenever we receive an email.
  serverOpts.onData = onData.bind(this)

  // Let's create the SMTP server (but we aren't starting it just yet)
  this.server = new SMTPServer(serverOpts)

  // We are going to do some fancy error logic here. When we first start the
  // SMTP server, there is a chance it will fail to start. In that case, it
  // will never call the `listening` event handler but will instead invoked the
  // `error` event. This first error should be returned to the calling function
  // letting it know that the constructor failed to start the server. But if
  // starting the server succeeds, all errors from that point forward should
  // be handled by the `opts.onError` event handler. So what we do is have
  // errorHandler point to callback until the `listening` event is triggered
  // by the server, and then we switch it over to `opts.onError` for future
  // errors handling.
  var errorHandler = callback
  function onError (e) {
    // When an error is encountered, call whichever callback has been assigned
    // to errorHandler (whether that be callback or opts.onError)
    return errorHandler(e)
  }
  this.server.on('error', onError)

  // Cache this reference as self for use inside callback below
  var self = this
  // Before starting the server, we need to make sure the temporary directory
  // where we will store message bodies exists
  mkdirp(path.join(os.tmpdir(), this.opts.tmpdir), function tmpdirExists (e) {
    // If we failed to create the directory, we won't be able to run our server
    if (e) {
      return onError(e)
    }

    // Finally we are ready to start the server
    self.server.listen(self.opts.port, self.opts.host, function listening () {
      // Once the server has started, all future errors can be directed to the
      // supplied error handler
      errorHandler = self.opts.onError
      log.info(`SMTP Server started on ${self.opts.host}:${self.opts.port}`);
      // Let the caller know that we have successfully started the server
      return callback(null, self)
    })
  })
}

// onData is called whenever our server receives an email. It takes an
// incomming message, caches it on the local hard drive, and then calls the
// onEmail handler provided to the constuctor. Once all of the emails have
// finished being handled, it returns back to the smtp-server library
function onData (stream, session, callback) {
  // Convert the rcptTo array to an array of addresses broken apart by their
  // components. This makes it easier to work with this library.
  var addressList = session.envelope.rcptTo.map((v) => v.address).join(', ')
  var addresses = address.parseAddressList(addressList)

  // Keep track of how many of the email addresses our user's onEmail handler
  // has already finished working through. Once onEmail has finished working
  // through all of the emails, let the smtp-server know wer are done.
  var counter = addresses.length
  function addressCallback (e) {
    if (--counter === 0) {
      return callback();
    }
  }

  // Cache `this` for access inside the callback
  var self = this
  // Generate a random file name
  crypto.randomBytes(60, function randomBytes (e, buff) {
    // If we failed to generate random bytes... for some reason?... we will
    // call the `onError` callback of our function
    if (e) {
      // Give our error some extra context
      e.message = `Failed to generate random bytes: ${e.message}`
      // Let the user know this failed
      self.opts.onError(e)
      // drain the stream
      stream.pipe(require('dev-null')())
      // Give up handling this message, when the pipe is done flushing, let the
      // SMTP server know we are done.
      return stream.on('end', function () {
        callback()
      })
    }
    // Convert the returned buffer into a random filename of the integers [0,9]
    var filename = buff
      .toString('ascii')
      .split('')
      .map((v) => v.charCodeAt(0) % 10)
      .join('') + '.txt'

    // Now get the path to this file in in the temporary directory and open
    // a writable pipe to it
    var pathname = path.join(os.tmpdir(), self.opts.tmpdir, filename)
    var filePipe = fs.createWriteStream(pathname)

    // Let's stream the contents of the message to our new temporary file
    stream.pipe(filePipe)
    stream.on('end', function cachedMessage () {
      // Finally, pass each email to `onEmail` individually along with the path
      // to the cached message body on disk
      for (var i = 0; i < addresses.length; i++) {
        self.opts.onEmail(addresses[i], pathname, addressCallback)
      }
    })
  })
}

module.exports = Receiver
