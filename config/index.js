module.exports = {
  heroku: {
    id: process.env.HEROKU_ID,
    password: process.env.HEROKU_PASSWORD
  },
  mailer: {
    host: process.env.MAIL_API_HOST,
    port: process.env.MAIL_API_PORT,
    secure: true,
    auth: {
      user: process.env.MAIL_API_USERNAME,
      pass: process.env.MAIL_API_PASSWORD
    }
  }
}

// Lock this config object down so we can't accidentally change it during
// runtime
Object.freeze(module.exports)
