var request = require('request')

var Heroku = module.exports = function Heroku (id, password) {
  if(!(this instanceof Heroku)) {
    return new Heroku(id, password)
  }

  this.id = id
  this.password = password
  return this
}

Heroku.prototype.getEmail = function getEmail (appId, cb) {
  var opts = {
    url: `https://${this.id}:${this.password}@api.heroku.com/vendor/apps/${appId}`,
    json: true
  }

  console.log(opts)

  return request.get(opts, function (e, resp, body) {
    if(e) {
      return cb(e)
    }
    if(resp.statusCode === 404) {
      return cb(new Error('Add-on Not Found'))
    }
    if(resp.statusCode === 401) {
      return cb(new Error('Wrong id and/or password'))
    }
    if(resp.statusCode !== 200) {
      return cb(new Error(`Recevied response code: ${resp.statusCode}`))
    }
    if(body.owner_email == undefined) {
      return cb(new Error('No owner email found'))
    }

    return cb(null, body.owner_email)
  })
}
