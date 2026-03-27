
const sqlite3 = require('sqlite3').verbose();
// Trying the 5.4MB database
const db = new sqlite3.Database('C:/Rexermi/backend/prisma/dev.db');

db.serialize(() => {
  db.each("SELECT count(*) as count FROM User", (err, row) => {
    if (err) console.error("Error User count: "+err);
    else console.log("Users count: " + row.count);
  });
  db.each("SELECT storeName FROM SystemConfig LIMIT 1", (err, row) => {
    if (err) console.error("Error Store: "+err);
    else console.log("Store Name: " + row.storeName);
  });
});
db.close();
