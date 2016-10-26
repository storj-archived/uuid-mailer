'use strict';
// We use the request module to query the heroku API
var request = require('request');
// Using bole as a logger
var log = require('bole')('heroku');
// We use async for our retry logic
var async = require('async');
// Config contains our retry numbers
var config = require('../../config');

// We model this module as an object. Probably not necessary since it doesn't
// maintain state, but this keeps us consistent with other modules in use. This
// also lets us add other stateful requests further down the road.
var Heroku = module.exports = function Heroku (id, password, url) {
  // Be nice, if this wasn't invoked using the new operator, go ahead and do
  // that for the user.
  if(!(this instanceof Heroku)) {
    return new Heroku(id, password, url);
  }

  // Give the Heroku object the credentials used to hit the API
  this.id = id;
  this.password = password;
  // We also specify a dynamic API endpoint for heroku, this makes testing
  // easier.
  this.url = url;
  return this;
};

// getEmail retrieves the email address belonging to an add-on with the UUID
// provided in the first argument.
// TODO: Bake in retry logic. Only certain classes of errors should be retried,
// this should be resiliant to Heroku's API going down. Only 404 should result
// in a true error (and even then, is a 404 definitive? Is it possible heroku
// isn't reflecting a newly registered add-on yet?).
Heroku.prototype.getEmail = function getEmail (appId, cb) {
  // Structure the get request to fetch the user's email address
  var opts = {
    url: `${this.url}/vendor/apps/${appId}`,
    auth: {
      'user': this.id,
      'pass': this.password
    },
    json: true
  };

  log.info(opts);

  log.info('Fetching Heroku email address for appId %s', appId);

  // Kick off the request to the Heroku API
  return async.retry({
    times: config.retry.interval,
    interval: function (count) {
      return config.retry.baseDeply * Math.pow(config.retry.exponent, count);
    }
  }, function (cb) {
    request.get(opts, function (e, resp, body) {
      if(e) {
        return cb(e);
      }
      // 404 means that the add-on doesn't exist according to heroku
      if(resp.statusCode === 404) {
        return cb(new Error('Add-on Not Found'));
      }
      // 401 means that heroku didn't accept our username/password
      if(resp.statusCode === 401) {
        return cb(new Error('Wrong id and/or password'));
      }
      // The sky is falling
      if(resp.statusCode !== 200) {
        return cb(new Error(`Recevied response code: ${resp.statusCode}`));
      }
      // If we didn't get back a users' email address for whatever reason, that
      // is an error condition.
      /* jshint ignore:start */
      if(body == undefined || body.owner_email == undefined) {
        return cb(new Error('No owner email found'));
      }
      /* jshint ignore:end */

      // If we recieved a 200 response and got back an email address, this was
      // a success!
      return cb(null, body.owner_email);
    });
  }, cb);
};
