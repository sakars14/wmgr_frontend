// pages/zerodha-status.js
import { useState } from "react";
import { auth } from "../lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ZerodhaStatusPage() {
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setErr("");
      const user = auth.currentUser;
      if (!user) {
        setErr("Not signed in");
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/zerodha/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Zerodha status</h1>
      <button className="btn" onClick={checkStatus} disabled={loading}>
        {loading ? "Checking…" : "Check Zerodha connection"}
      </button>

      {err && <p style={{ color: "tomato" }}>{err}</p>}

      {result && (
        <pre style={{ marginTop: 16 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
