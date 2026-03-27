const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const logFile = path.join(app.getPath('userData'), 'rexermi.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [INFO] ${message}`;
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

function error(message) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [ERROR] ${message}`;
  console.error(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

function warn(message) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [WARN] ${message}`;
  console.warn(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

module.exports = {
  log,
  error,
  warn,
};
