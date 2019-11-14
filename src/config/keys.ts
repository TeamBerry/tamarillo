import * as fs from 'fs'
const path = require("path")

export const PRIVATE_KEY = fs.readFileSync(path.resolve(__dirname, './../../certs/auth'), 'utf8')
export const PUBLIC_KEY = fs.readFileSync(path.resolve(__dirname + './../../certs/auth.pub'), 'utf8')
