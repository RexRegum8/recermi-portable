
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const files = [
  'C:/Rexermi/backend/prisma/dev.db',
  'C:/Rexermi/Rexermi_Ready/resources/app/backend/prisma/dev.db',
  'C:/Users/jdlva/AppData/Roaming/rexermi-os/rexermi.db',
  'c:/Rexermi/Rexermi_Portable/Rexermi-win32-x64/resources/app/backend/prisma/dev.db',
  'c:/Rexermi/Rexermi_Portable/Rexermi-win32-x64/resources/app/backend/prisma/dev.db.bak'
];

async function check(file) {
  if (!fs.existsSync(file)) {
    console.log(`[NOT FOUND] ${file}`);
    return;
  }
  return new Promise((resolve) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.log(`[ERROR OPENING] ${file}: ${err.message}`);
        resolve();
        return;
      }
      db.get("SELECT count(*) as count FROM User", (err, row) => {
        const userCount = err ? `Error: ${err.message}` : row.count;
        db.get("SELECT storeName FROM SystemConfig LIMIT 1", (err, row) => {
          const store = err ? `Error: ${err.message}` : (row ? row.storeName : 'EMPTY');
          console.log(`[FILE] ${file}\n  Size: ${fs.statSync(file).size}\n  Users: ${userCount}\n  Store: ${store}`);
          db.close();
          resolve();
        });
      });
    });
  });
}

(async () => {
  console.log("--- DATABASE INVENTORY ---");
  for (const f of files) {
    await check(f);
  }
  console.log("--- END ---");
})();
