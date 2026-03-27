const fs = require('fs');
const path = require('path');
const assetsDir = 'c:/Rexermi-win32-x64/resources/app/dist/assets';
const files = fs.readdirSync(assetsDir);
files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    if (content.includes('Impresiones')) {
      console.log(`FOUND in ${file}`);
    } else {
      console.log(`NOT found in ${file}`);
    }
  }
});
