var request = require('request')

var Heroku = module.exports = function Heroku (id, password, url) {
  if(!(this instanceof Heroku)) {
    return new Heroku(id, password, url)
  }

  this.id = id
  this.password = password
  this.url = url
  return this
}

Heroku.prototype.getEmail = function getEmail (appId, cb) {
  var opts = {
    url: `${this.url}/vendor/apps/${appId}`,
    auth: {
      'user': this.id,
      'pass': this.password
    },
    json: true
  }

  /*
  console.log(opts)

  console.log('Fetching Heroku email address for appId %s', appId);
  */

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
      if(body == undefined || body.owner_email == undefined) {
        return cb(new Error('No owner email found'))
      }

      return cb(null, body.owner_email)
    }
  )
}
