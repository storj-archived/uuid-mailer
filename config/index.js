// We don't need to test our configuration file
/* istanbul ignore next */
module.exports = {
  mongo: {
    url: process.env.MONGO_URL,
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASSWORD,
    ssl: (typeof process.env.MONGO_SSL !== 'undefined') ?
      process.env.MONGO_SSL.toLowerCase() === 'true' :
      true,
    sslValidate: (typeof process.env.MONGO_SSL_VALIDATE !== 'undefined') ?
      process.env.MONGO_SSL_VALIDATE.toLowerCase() === 'true' :
      true,
    checkServerIdentity: (typeof process.env.MONGO_CSID !== 'undefined') ?
      process.env.MONGO_CSID.toLowerCase() === 'true' :
      true
  },
  mailer: {
    host: process.env.MAIL_API_HOST,
    port: process.env.MAIL_API_PORT,
    secureConnection: (typeof process.env.MAIL_SECURE === 'string') ?
      process.env.MAIL_SECURE.toLowerCase() === 'false' :
      true,
    tls: {
      rejectUnauthorized:  (typeof process.env.MAIL_SECURE === 'string') ?
        process.env.MAIL_SECURE.toLowerCase() === 'true' :
        true
    },
    auth: {
      user: process.env.MAIL_API_USERNAME,
      pass: process.env.MAIL_API_PASSWORD
    }
  },
  receiver: {
    port: process.env.RECEIVER_PORT || 25,
    host: process.env.RECEIVER_HOST || '0.0.0.0',
    tmpdir: process.env.RECEIVER_TMPDIR || 'storj-mailer'
  },
  log: {
    level: process.env.LOG_LEVEL || 'info'
  },
  retry: {
    interval: 15,
    baseDelay: 50,
    exponent: 2
  }
};

// Configure logging
require('bole').output({
  level: module.exports.log.level,
  stream: process.stdout
});

// Lock this config object down so we can't accidentally change it during
// runtime
Object.freeze(module.exports);
