var Receiver = require('./lib/receiver')

new Receiver({ onEmail: onEmail, onError: onError }, onError)

function onEmail(address, pathname, cb) {
  cb()
}

function onError(e) {
  if(e) return console.error(e)
}
