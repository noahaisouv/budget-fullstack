import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const fetchTransactions = () => {
    axios.get("http://localhost:3001/transactions")
      .then(res => setTransactions(res.data));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const addTransaction = () => {
    if (!title || !amount) return;

    axios.post("http://localhost:3001/transactions", {
      type: "expense",
      title,
      amount,
      date: new Date().toISOString(),
      category: "💸"
    }).then(() => {
      setTitle("");
      setAmount("");
      fetchTransactions();
    });
  };

  const remove = (id) => {
    axios.delete("http://localhost:3001/transactions/" + id)
      .then(() => fetchTransactions());
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>💰 Gestion de Budget (Fullstack)</h1>

      <input
        placeholder="Description"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Montant"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={addTransaction}>Ajouter</button>

      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.title} — {t.amount} €
            <button onClick={() => remove(t.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
