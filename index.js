'use strict';
// Receiver is responsible for registering an SMTP client that receives emails
// destined for [UUID]@heroku.storj.io
var Receiver = require('./lib/receiver');
// Heroku is used to resolve the UUID of an incomming email to an actual heroku
// user, fetching that user's email address in case we need to forward it.
var Heroku = require('./lib/heroku');
// In the event we forward an email, Mailer is used.
var Mailer = require('./lib/sender');
// Load in our runtime configuration.
var config = require('./config');
// MailParser is used to handle parsing an SMTP message out into usable
// components such as the body, subject, and sender.
var MailParser = require('mailparser').MailParser;
// Receiver stores a the incomming SMTP message on the filesystem, we need to
// read it from disk so we use fs.
var fs = require('fs');
// autoaccept contains the logic for automatically accepting an incomming
// registration email for a heroku user.
var autoaccept = require('./lib/autoaccept');
// We use bole for logging, it is configured in ./config
var log = require('bole')('account-mapper');

// onEmail is the event handler that is triggered when a new email is received
// by the server.
function onEmail(address, pathname, cb) {
  // Cache the reference to this for use in nested functions
  var self = this; // jshint ignore:line
  log.info('Received email for %s', address.address);
  // Resolve the UUID for incomming email to a heroku account. This also
  // verifies that the incoming email belongs to a real heroku add-on, and
  // that this API isn't being abused to register bot accounts. If the UUID
  // does not exist on Heroku's end, we will return an error instead of
  // registering the account.
  self.heroku.getEmail(address.local, function haveEmail (e, forwardAddr) {
    // If we encounter an error, then we should assume the heroku address does
    // not exist, and we should return.
    if(e) {
      log.error(e);
      return cb(e);
    }

    log.info(
      'Successfully mapped address %s to %s',
      address.address,
      forwardAddr);

    // Next, we will parse the file we were given by Receiver. The file should
    // be an SMTP message body that Receiver wrote to the file system. To begin
    // the process of reading, we instantiate a new parser.
    var parser = new MailParser({ streamAttachments: true });
    // Once we have our new parser, we define what we should do once parsing
    // is done. In this case, we are buffering the entire email body into
    // memory, moving forward we may be able to optimize this out using streams
    // if this application ends up receiving quite a bit of traffic.
    parser.on('end', function parsedSMTP (email) {
      // Ensure the parsed message had all of the bits we expected, if not then
      // the message is corrupt and there isn't really anything we can do
      // (especially since we can't trust the message at this point)
      if(!email.from || !email.subject || !email.text || !email.html) {
        return cb(new Error('Invalid SMTP message'));
      }

      // If the subject of the email is to confirm the email address, then we
      // know it is a registration email. Otherwise we pass the message on
      // through. This is coupling our application's logic to the bridge's
      // email format, but we don't see a way around it. The worst case here is
      // that a heroku user receives an email requiring that they confirm their
      // account.
      if(email.subject.indexOf('Confirm Your Email Address') !== -1) {
        log.info(`Auto accepting registration for ${forwardAddr}`);
        // Once we have loaded the email from disk, and have confirmed that this
        // message was a registration email, we can auto accept registration on
        // behalf of the user.
        return autoaccept(email.html, function accepted(e) {
          // The callback simply lets us log a message before calling the cb
          if(e) {
            log.error(`Failed to auto accept: ${e.message}`);
          }
          return cb(e);
        });
      }

      // Since the message didn't have the subject we expect of registration
      // emails, we will go ahead and forward it onto the user. We start by
      // coercing the incomming email message into a format mailer understands.
      var opts = {
        to: forwardAddr,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      };

      log.info('Forwarding email to address %s', forwardAddr);

      // Use the transporter from the bridge's repository to forward the email
      // along to the end user.
      return self.mailer._transporter.sendMail(opts, function sent(e, info) {
        if(e) {
          log.error('Error sending email for %s: %s', forwardAddr, e);
          return cb(e);
        }

        log.info('Email for %s sent with messageId %s',
          forwardAddr,
          info.messageId);
        return cb(e);
      });
    });
    // Now that we have a handler registered, go ahead and start piping the
    // SMTP message into the parser, once it is done loading off of disk it
    // will trigger the above logic.
    fs.createReadStream(pathname).pipe(parser);
  });
}

// If Receiver encounters an error, this is the error handling logic it should
// use instead of throwing.
function onError (e) {
  if(e) { return log.error(e); }
}

// Bootstrap is the entrypoint logic for this application. When started via
// the command line, this function is called to startup the app. When required
// in by the tests, this is the function exported.
function bootstrap (cb) {
  // Attach all of our instantiated objects to a single object for easy
  // tracking. This lets our unit tests interact with the individual
  // components instantiated by this file.
  var result = {};
  // Create a new receiver, and register our onEmail logic above to it.
  Receiver(
    {
      port: config.receiver.port,
      host: config.receiver.host,
      tmpdir: config.receiver.tmpdir,
      // the `this` context will contain the heroku and mailer objects for the
      // onEmail and onError functions.
      onEmail: onEmail.bind(result),
      onError: onError.bind(result)
    },
    function SMTPUp (e, smtp) {
      result.receiver = smtp;
      return cb(e, result);
  });
  result.heroku = new Heroku(config.heroku.id,
    config.heroku.password,
    config.heroku.url);
  result.mailer = new Mailer(config.mailer);
}

// Make this easier to test. If we are required in by another module, we will
// export a function that lets that module control this application.
/* istanbul ignore else */
if(module.parent) {
  module.exports = bootstrap;
} else {
  // We were started from the command line, so startup like normal
  bootstrap(function started(e) {
    // If there was an error, let the process die in a blaze of glory
    if(e) { throw e; }
    log.info('account mapper started succesfully');
  });
}
