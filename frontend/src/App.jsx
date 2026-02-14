import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("userEmail") || "");
  const [errorMessage, setErrorMessage] = useState("");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTransactions = () => {
    if (!token) return;

    axios
      .get(`${API_BASE_URL}/transactions`, { headers: authHeaders })
      .then((res) => {
        setTransactions(res.data);
      })
      .catch(() => {
        handleLogout();
      });
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [token]);

  const handleAuth = () => {
    if (!email || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setErrorMessage("");

    axios
      .post(`${API_BASE_URL}/auth/${authMode}`, { email, password })
      .then((res) => {
        const nextToken = res.data.token;
        const nextEmail = res.data.user.email;

        localStorage.setItem("token", nextToken);
        localStorage.setItem("userEmail", nextEmail);

        setToken(nextToken);
        setUserEmail(nextEmail);
        setPassword("");
      })
      .catch((error) => {
        setErrorMessage(error.response?.data?.error || "Authentication failed.");
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken("");
    setUserEmail("");
    setTransactions([]);
  };

  const addTransaction = () => {
    if (!title || !amount || !token) return;

    axios
      .post(
        `${API_BASE_URL}/transactions`,
        {
          type: "expense",
          title,
          amount,
          date: new Date().toISOString(),
          category: "💸",
        },
        { headers: authHeaders }
      )
      .then(() => {
        setTitle("");
        setAmount("");
        fetchTransactions();
      });
  };

  const remove = (id) => {
    axios.delete(`${API_BASE_URL}/transactions/${id}`, { headers: authHeaders }).then(() => fetchTransactions());
  };

  const totals = transactions.reduce(
    (acc, transaction) => {
      const numericAmount = Math.abs(Number(transaction.amount) || 0);

      if (transaction.type === "income") {
        acc.income += numericAmount;
      } else if (transaction.type === "expense") {
        acc.expense += numericAmount;
      } else if ((Number(transaction.amount) || 0) >= 0) {
        acc.income += numericAmount;
      } else {
        acc.expense += numericAmount;
      }

      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f5fb",
          padding: "24px",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h1 style={{ margin: "0 0 8px", textAlign: "center", color: "#1f2937" }}>Budget Auth</h1>
          <p style={{ margin: 0, textAlign: "center", color: "#6b7280" }}>
            {authMode === "login" ? "Login to continue" : "Create an account"}
          </p>

          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px" }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px" }}
          />

          {errorMessage ? <p style={{ margin: 0, color: "#dc2626" }}>{errorMessage}</p> : null}

          <button
            onClick={handleAuth}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {authMode === "login" ? "Login" : "Register"}
          </button>

          <button
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setErrorMessage("");
            }}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f5fb",
        padding: "32px",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 700 }}>💰 Budget Dashboard</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#4b5563", fontWeight: 500 }}>{userEmail}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#1f2937",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", backgroundColor: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>Total Income</p>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#059669" }}>{totals.income.toFixed(2)} €</h2>
          </div>
          <div style={{ flex: "1 1 220px", backgroundColor: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>Total Expense</p>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#dc2626" }}>{totals.expense.toFixed(2)} €</h2>
          </div>
          <div style={{ flex: "1 1 220px", backgroundColor: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>Balance</p>
            <h2 style={{ margin: 0, fontSize: "28px", color: balance >= 0 ? "#16a34a" : "#dc2626" }}>{balance.toFixed(2)} €</h2>
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Description"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: "1 1 220px", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px" }}
          />
          <input
            placeholder="Montant"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: "1 1 180px", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px" }}
          />
          <button
            onClick={addTransaction}
            style={{ padding: "12px 18px", borderRadius: "10px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
          >
            Ajouter
          </button>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "8px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {transactions.map((t) => (
              <li
                key={t.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderBottom: "1px solid #e5e7eb", gap: "12px" }}
              >
                <span style={{ fontWeight: 500 }}>{t.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: t.type === "income" ? "#059669" : "#dc2626", fontWeight: 600 }}>{Number(t.amount).toFixed(2)} €</span>
                  <button
                    onClick={() => remove(t.id)}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "none", backgroundColor: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
