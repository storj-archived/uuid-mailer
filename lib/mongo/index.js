'use strict';
// We use the storj-service-storage-models to fetch users from the databse
var Storage = require('storj-service-storage-models');
// Using bole as a logger
var log = require('bole')('mongodb');
// We use async for our retry logic
var async = require('async');
// Config contains our retry numbers
var config = require('../../config');

// Maintain our authenticated state and storj storage models
var Mongo = module.exports = function Mongo ( url, user, pass, sslOptions ) {
  var ssl = sslOptions.ssl;
  var sslValidate = sslOptions.sslValidate;
  var checkServerIdentity = sslOptions.sslValidate;

  // Be nice, if this wasn't invoked using the new operator, go ahead and do
  // that for the user.
  if(!(this instanceof Mongo)) {
    return new Mongo(url, user, pass, ssl);
  }

  var logger = {
    error: function() {
      log.error.apply(log, arguments);
    },
    log: function() {
      log.info.apply(log, arguments);
    }
  };
  this.db = new Storage(url, {
    user,
    pass,
    mongos: {
      ssl,
      sslValidate,
      checkServerIdentity
    }
  }, logger);
  return this;
};

// getEmail retrieves the email address belonging to an add-on with the UUID
// provided in the first argument.
Mongo.prototype.getEmail = function getEmail (uuid, cb) {
  var self = this;
  log.info('Fetching storj email address for uuid %s', uuid);

  // Don't give up on the first try, keep trying to find a user
  return async.retry({
    times: config.retry.interval,
    interval: function (count) {
      return config.retry.baseDelay * Math.pow(config.retry.exponent, count);
    }
  }, function (cb) {
    // Fetch the user from the database and retun their email address
    self.db.models.User.findOne({ uuid }, function(e, user) {
      if(e) { return cb(e); }
      if(!user) { return cb(new Error(`No user found with uuid ${uuid}`)); }
      return cb(null, user.email);
    });
  }, cb);
};
