var Receiver = require('./lib/receiver')
var Heroku = require('./lib/heroku')
var Mailer = require('./lib/sender')
var config = require('./config')
var fs = require('fs')

new Receiver({ onEmail: onEmail, onError: onError }, onError)
var heroku = new Heroku(config.heroku.id, config.heroku.password)
//var mailer = new Mailer(config.mailer)

function onEmail(address, pathname, cb) {
  console.log(address.address)
  heroku.getEmail(address.local, function haveHerokuEmail(e, forwardAddr) {
    if(e) {
      console.error(e)
      return cb(e)
    }

    console.log(forwardAddr)

    /*
    var opts = {
      to: forwardAddr,
      from: , // from original email
      subject: , // from original email
      html: fs.createReadStream(pathname)
    }

    mailer._transporter.sendMail(opts, function mailSent() {
      if(e) console.error(e)
      cb(e)
    })
    */
  })
}

function onError(e) {
  if(e) return console.error(e)
}
