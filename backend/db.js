const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./budget.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.all("PRAGMA table_info(transactions)", [], (err, columns) => {
    if (err) {
      console.error("Failed to inspect transactions table", err);
      return;
    }

    const hasUserIdColumn = columns.some((column) => column.name === "user_id");

    if (!hasUserIdColumn) {
      db.run("ALTER TABLE transactions ADD COLUMN user_id INTEGER", (alterError) => {
        if (alterError) {
          console.error("Failed to add user_id column to transactions table", alterError);
        }
      });
    }
  });
});

module.exports = db;
