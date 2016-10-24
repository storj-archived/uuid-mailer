var Receiver = require('./lib/receiver');
var Heroku = require('./lib/heroku');
var Mailer = require('./lib/sender');
var config = require('./config');
var MailParser = require('mailparser').MailParser;
var fs = require('fs');
var autoaccept = require('./lib/autoaccept');
var log = require('bole')('account-mapper')

function onEmail(address, pathname, cb) {
  log.info('Received email for %s', address.address);
  this.heroku.getEmail(address.local, function haveHerokuEmail(e, forwardAddr) {
    if(e) {
      log.error(e);
      return cb(e);
    }

    log.info('Successfully mapped address %s to %s', address.address, forwardAddr);

    var parser = new MailParser({ streamAttachments: true });
    parser.on('end', function parsedSMTP (email) {
      var opts = {
        to: forwardAddr,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      };

      if(!opts.from || !opts.subject || !opts.text || !opts.html) {
        return cb(new Error('Invalid SMTP message'))
      }

      /*
       * TODO: Detect if email is for registration, if not forward it on.
      log.info('Forwarding email to address %s', forwardAddr);

      return mailer._transporter.sendMail(opts, function mailSent(e, info) {
        if(e) {
          return log.error('Error sending email for %s: %s', forwardAddr, e)
        }

        log.info('Email for %s sent with messageId %s', forwardAddr, info.messageId);
        return cb(e);
      });
      */

      log.info(`Auto accepting registration for ${forwardAddr}`);
      autoaccept(forwardAddr, email.from, email.html, function accepted(e) {
        if(e) {
          log.error(`Failed to auto accept: ${e.message}`);
        }
        return cb(e);
      });
    });
    fs.createReadStream(pathname).pipe(parser);
  });
}

function onError (e) {
  if(e) return log.error(e);
}

// Bootstrap is the entrypoint logic for this application. When started via
// the command line, this function is called to startup the app. When required
// in by the tests, this is the function exported.
function bootstrap (cb) {
  var result = {}
  new Receiver(
    {
      port: config.receiver.port,
      host: config.receiver.host,
      tmpdir: config.receiver.tmpdir,
      onEmail: onEmail.bind(result),
      onError: onError.bind(result)
    },
    function SMTPUp (e, smtp) {
      // TODO: rollback heroku and mailer if needed
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
  module.exports = bootstrap
} else {
  // We were started from the command line, so startup like normal
  bootstrap(function started(e) {
    // If there was an error, let the process die in a blaze of glory
    if(e) { throw e; }
    log.info('account mapper started succesfully');
  });
}
