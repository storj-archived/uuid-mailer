# heroku.storj.io email service

This service supports the [Storj Heroku Add-on](https://github.com/Storj/integration-service/)

It receives emails destined for [HEROKU_INSTALLATION_UUID]@heroku.storj.io and forwards them along to the email address of the heroku user who currently owns the installation.

The initial implementation of this will use [Haraka](https://haraka.github.io/)

# ToDo

### Message retry

Currently, when we receive an email that should be sent but the heroku API responds with an error, instead of storing that email and retrying later we simply discard it and log the error. This will result in (hopefully) very rare cases of registration emails being lost.

Moving forward we should decouple the logic of receiving and storing emails from the logic of resolving the email address to the heroku owner's email address and forwarding.
