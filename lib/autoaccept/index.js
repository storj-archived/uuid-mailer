// We will use cheerio to parse the html email message body. Cheerio is like
// JQuery, but for the server!
var cheerio = require('cheerio');
// We use request to call the registration link provided to us by a
// registration email.
var request = require('request');

// auto-accept takes the body of a registration email, rips out the url to
// register at, and uses request to do a GET request on that endpoint. This
// effectively auto-registers a user on the bridge, allowing the heroku add-on
// to bypass the email registration step.
module.exports = function autoAccept (html, cb) {
  // Grab the first url from the body of the email. This should work for all
  // valid registration emails.
  var url = cheerio.load(html)('a').attr('href');
  if(!url) {
    // If we don't find a link, that means this is either broken parsing logic
    // on our part, or an invalid registration email. Either way, return an
    // error.
    return cb(new Error('Undefined link'));
  }

  // Once we have the url, try to hit the endpoint.
  // TODO: retry on failure
  request.get(url, cb);
}
