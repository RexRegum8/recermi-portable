
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Rexermi/Rexermi_Portable/Rexermi-win32-x64/resources/app/release/win-unpacked/resources/app.asar.unpacked/backend/prisma/dev.db');

db.serialize(() => {
  db.each("SELECT count(*) as count FROM User", (err, row) => {
    if (err) console.error(err);
    else console.log("Users count: " + row.count);
  });
  db.each("SELECT count(*) as count FROM Product", (err, row) => {
    if (err) console.error(err);
    else console.log("Products count: " + row.count);
  });
  db.each("SELECT storeName FROM SystemConfig LIMIT 1", (err, row) => {
    if (err) console.error(err);
    else console.log("Store Name: " + row.storeName);
  });
});
db.close();
