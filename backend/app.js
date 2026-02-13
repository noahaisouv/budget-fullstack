const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

// 🔹 Middlewares
app.use(cors());
app.use(express.json());


// 🔹 GET all transactions
app.get("/transactions", (req, res) => {
  db.all("SELECT * FROM transactions", [], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});


// 🔹 POST new transaction
app.post("/transactions", (req, res) => {
  const { type, title, amount, date, category } = req.body;

  db.run(
    "INSERT INTO transactions (type, title, amount, date, category) VALUES (?, ?, ?, ?, ?)",
    [type, title, amount, date, category],
    function (err) {
      if (err) return res.status(500).send(err);
      res.json({ id: this.lastID });
    }
  );
});


// 🔹 DELETE transaction
app.delete("/transactions/:id", (req, res) => {
  db.run(
    "DELETE FROM transactions WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).send(err);
      res.json({ deleted: this.changes });
    }
  );
});


// 🔹 GET monthly summary
app.get("/summary", (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Month is required (YYYY-MM)" });
  }

  db.all(
    "SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ?",
    [month],
    (err, rows) => {
      if (err) return res.status(500).send(err);

      const totalIncome = rows
        .filter((r) => r.type === "income")
        .reduce((a, b) => a + b.amount, 0);

      const totalExpense = rows
        .filter((r) => r.type === "expense")
        .reduce((a, b) => a + b.amount, 0);

      res.json({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      });
    }
  );
});

module.exports = app;
