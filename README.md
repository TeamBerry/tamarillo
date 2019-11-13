# Setup

## Deploy
```
scp -r dist/ package.json processes.json root@berrybox.tv:berrybox/Chronos/
rm -rf node_modules npm-shrinkwrap.json
npm restart
```

## Auth Keys
To run, the project requires a set of RSA keys.

- Create a `certs/` folder
- Create a new pair of RSA keys: `touch auth auth.pub`
- Go to http://travistidwell.com/jsencrypt/demo/ and create a 512-bit pair of keys
- Paste each one into the correct file. Private => `auth`, Public => `auth.pub`