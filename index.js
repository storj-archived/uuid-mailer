var Receiver = require('./lib/receiver')
var Heroku = require('./lib/heroku')
var Mailer = require('./lib/sender')
var config = require('./config')
var MailParser = require('mailparser')
var fs = require('fs')

new Receiver({ onEmail: onEmail, onError: onError }, onError)
var heroku = new Heroku(config.heroku.id, config.heroku.password)
var mailer = new Mailer(config.mailer)

function onEmail(address, pathname, cb) {
  console.log(address.address)
  heroku.getEmail(address.local, function haveHerokuEmail(e, forwardAddr) {
    if(e) {
      console.error(e)
      return cb(e)
    }

    console.log(forwardAddr)

    var parser = new MailParser({ streamAttachments: true })
    parser.on('end', function parsedSMTP (email) {
      var opts = {
        to: forwardAddr,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      }

      return mailer._transporter.sendMail(opts, function mailSent() {
        if(e) console.error(e)
        return cb(e)
      })
    })
    fs.createReadStream(pathname).pipe(parser)
  })
}

function onError(e) {
  if(e) return console.error(e)
}
