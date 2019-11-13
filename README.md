# Setup

## Amazon SES
- The file to create is here: ~/.aws/credentials

## Deploy

```
scp -r dist/ package.json processes.json root@berrybox.tv:berrybox/Chronos/
rm -rf node_modules npm-shrinkwrap.json
npm restart
```