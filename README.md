# Setup

## Amazon SES
This project uses Amazon Simple Email Service (SES) to send mails. Locally,
it uses maildev to catch those mails. In case you need to send mails for real, you'll need AWS credentials.
- The file to create to store those credentials is here: ~/.aws/credentials

## YouTube API
This project uses the official YouTube API to fetch videos. If you want to run this project locally, you'll need an API Key issued by Google.

## Deploy

```
scp -r dist/ package.json processes.json root@berrybox.tv:berrybox/Chronos/
rm -rf node_modules npm-shrinkwrap.json
npm install
npm restart
```

## Auth Keys
To run, the project requires a set of RSA keys.

- Create a `certs/` folder
- Create a new pair of RSA keys: `touch auth auth.pub`
- Go to http://travistidwell.com/jsencrypt/demo/ and create a 1024-bit pair of keys
- Paste each one into the correct file. Private => `auth`, Public => `auth.pub`