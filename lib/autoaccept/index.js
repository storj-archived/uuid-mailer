var cheerio = require('cheerio');
var request = require('request');

module.exports = function autoAccept (to, from, html, cb) {
  // Right now we are doing nothing with the to and from fields, but these
  // will be used to verify the sender and destination to prevent this from
  // being abused
  var url = cheerio.load(html)('a').attr('href');
  if(!url) {
    return cb(new Error('Undefined link'));
  }

  // TODO: retry on failure
  request.get(url, cb);
}
