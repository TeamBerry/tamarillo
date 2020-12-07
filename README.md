# Setup

## Amazon SES
This project uses Amazon Simple Email Service (SES) to send mails. Locally,
it uses maildev to catch those mails. In case you need to send mails for real, you'll need AWS credentials.
- The file to create to store those credentials is here: ~/.aws/credentials

## YouTube API
This project uses the official YouTube API to fetch videos. If you want to run this project locally, you'll need an API Key issued by Google.

## Tools
To run this server, you will also need:
- Docker
- Docker-compose
- Node 10+

## Auth Keys
To run, the project requires a set of RSA keys.

- Create a `certs/` folder
- Create a new pair of RSA keys: `touch auth auth.pub`
- Go to http://travistidwell.com/jsencrypt/demo/ and create a 1024-bit pair of keys
- Paste each one into the correct file. Private => `auth`, Public => `auth.pub`

# Get Started

## Start
Once you've created the auth keys, you can start the server by using the `npm run start` command. It will
fire up docker containers, compile the project and start the pm2 processes.

By default, the HTTP port is 3000, and the socket port is 8008.

## Test
To run tests, use the `npm run test` command

## Lint
To check for lint errors and fix it, the two following commands are available:

- `npm run lint:check` will check errors
- `npm run lint:fix` will fix auto-fixable errors