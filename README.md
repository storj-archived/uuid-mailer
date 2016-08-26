# heroku.storj.io email service

This service supports the [Storj Heroku Add-on](https://github.com/Storj/integration-service/)

It receives emails destined for [HEROKU_INSTALLATION_UUID]@heroku.storj.io and forwards them along to the email address of the heroku user who currently owns the installation.

The initial implementation of this will use [Haraka](https://haraka.github.io/)
