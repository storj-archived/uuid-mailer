module.exports = {
  heroku: {
    id: process.env.HEROKU_ID,
    password: process.env.HEROKU_PASSWORD
  }
}

// Lock this config object down so we can't accidentally change it during
// runtime
Object.freeze(module.exports)
