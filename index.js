var Receiver = require('./lib/receiver')
var Heroku = require('./lib/heroku')
var Mailer = require('./lib/sender')
var config = require('./config')
var MailParser = require('mailparser').MailParser
var fs = require('fs')

new Receiver({ onEmail: onEmail, onError: onError }, onError)
var heroku = new Heroku(config.heroku.id, config.heroku.password)
var mailer = new Mailer(config.mailer)

function onEmail(address, pathname, cb) {
  console.log('Received email for %s', address.address)
  heroku.getEmail(address.local, function haveHerokuEmail(e, forwardAddr) {
    if(e) {
      console.error(e)
      return cb(e)
    }

    console.log('Successfully mapped address %s to %s', address.address, forwardAddr);

    var parser = new MailParser({ streamAttachments: true });
    parser.on('end', function parsedSMTP (email) {
      var opts = {
        to: forwardAddr,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      };

      console.log('Forwarding email to address %s', forwardAddr);

      return mailer._transporter.sendMail(opts, function mailSent(e, info) {
        if(e) {
          return console.error('Error sending email for %s: %s', forwardAddr, e)
        }

        console.log('Email for %s sent with messageId %s', forwardAddr, info.messageId);
        return cb(e);
      });
    });
    fs.createReadStream(pathname).pipe(parser);
  });
}

function onError(e) {
  if(e) return console.error(e)
}
