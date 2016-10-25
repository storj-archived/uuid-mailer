// We don't need to test our configuration file
/* istanbul ignore next */
module.exports = {
  heroku: {
    id: process.env.HEROKU_ID,
    password: process.env.HEROKU_PASSWORD,
    url: process.env.HEROKU_URL || 'https://api.heroku.com'
  },
  mailer: {
    host: process.env.MAIL_API_HOST,
    port: process.env.MAIL_API_PORT,
    secureConnection: (typeof process.env.MAIL_SECURE === 'string')
      ? process.env.MAIL_SECURE.toLowerCase() === 'false'
      : true,
    tls: {
        rejectUnauthorized:  (typeof process.env.MAIL_SECURE === 'string')
      ? process.env.MAIL_SECURE.toLowerCase() === 'true'
      : true
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
  }
}

// Configure logging
require('bole').output({
  level: module.exports.log.level,
  stream: process.stdout
})

// Lock this config object down so we can't accidentally change it during
// runtime
Object.freeze(module.exports)
