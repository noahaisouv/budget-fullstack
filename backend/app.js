const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const db = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

app.use(cors());
app.use(express.json());

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

const signToken = (payload) => {
  const headerSegment = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = base64UrlEncode(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })
  );
  const content = `${headerSegment}.${payloadSegment}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(content)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${content}.${signature}`;
};

const verifyToken = (token) => {
  const [headerSegment, payloadSegment, signature] = token.split(".");
  if (!headerSegment || !payloadSegment || !signature) return null;

  const content = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(content)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const isValidSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!isValidSignature) return null;

  const payload = JSON.parse(base64UrlDecode(payloadSegment));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
};

const hashPassword = (password) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });

const comparePassword = (password, storedHash) =>
  new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
    });
  });

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const passwordHash = await hashPassword(password);

    db.run(
      "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
      [email.toLowerCase(), passwordHash, new Date().toISOString()],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(409).json({ error: "User already exists" });
          }

          return res.status(500).send(err);
        }

        const token = signToken({ id: this.lastID, email: email.toLowerCase() });

        return res.status(201).json({
          token,
          user: { id: this.lastID, email: email.toLowerCase() },
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], async (err, user) => {
    if (err) return res.status(500).send(err);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await comparePassword(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email });

    return res.json({ token, user: { id: user.id, email: user.email } });
  });
});

app.get("/transactions", authMiddleware, (req, res) => {
  db.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

app.post("/transactions", authMiddleware, (req, res) => {
  const { type, title, amount, date, category } = req.body;

  db.run(
    "INSERT INTO transactions (user_id, type, title, amount, date, category) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, type, title, amount, date, category],
    function (err) {
      if (err) return res.status(500).send(err);
      res.json({ id: this.lastID });
    }
  );
});

app.delete("/transactions/:id", authMiddleware, (req, res) => {
  db.run("DELETE FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
    if (err) return res.status(500).send(err);
    res.json({ deleted: this.changes });
  });
});

app.get("/summary", authMiddleware, (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Month is required (YYYY-MM)" });
  }

  db.all(
    "SELECT * FROM transactions WHERE user_id = ? AND strftime('%Y-%m', date) = ?",
    [req.user.id, month],
    (err, rows) => {
      if (err) return res.status(500).send(err);

      const totalIncome = rows.filter((r) => r.type === "income").reduce((a, b) => a + b.amount, 0);
      const totalExpense = rows.filter((r) => r.type === "expense").reduce((a, b) => a + b.amount, 0);

      res.json({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      });
    }
  );
});

module.exports = app;
