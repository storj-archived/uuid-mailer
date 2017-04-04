# user.storj.io email service

This service enables Storj to allow (approved) 3rd party integrations to send emails to Storj users, without the need of sharing those users email addresses with the 3rd party.

This is a simple email forwarding service that resolves `[uuid]@user.storj.io` to the user's real email address on file with storj, and forwards the email along to that final destination. In this way, integrations can send an email to the user `uuid` without needing to know their real email address.
