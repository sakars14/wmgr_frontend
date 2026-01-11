import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { auth } from "../../lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const formatInr = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `INR ${num.toLocaleString("en-IN")}`;
};

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000);
  }
  return null;
};

const formatDate = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "-";
};

export default function PortfolioIndex() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u || null);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setLoading(false);
      setInvestments([]);
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/investments/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load investments");
        }
        const rows = Array.isArray(data)
          ? data
          : (data?.items || data?.investments || []);
        if (alive) {
          setInvestments(rows);
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Failed to load investments");
          setInvestments([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [user, loadingUser]);

  return (
    <>
      <NavBar user={user} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        <h1>My Investments</h1>
        {loading ? (
          <div>Loading...</div>
        ) : !user ? (
          <div>Please sign in.</div>
        ) : error ? (
          <div style={{ color: "#b91c1c" }}>{error}</div>
        ) : investments.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No investments yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {investments.map((inv) => {
              const investmentId = inv.investmentId || inv.id;
              const bucketName = inv.bucketName || inv.bucketId || "Bucket";
              return (
                <div
                  key={investmentId || `${bucketName}-${formatDate(inv.createdAt)}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{bucketName}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {formatDate(inv.createdAt)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>{formatInr(inv.amount)}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {inv.status || "-"}
                      </div>
                    </div>
                  </div>
                  {investmentId && (
                    <div style={{ marginTop: 10 }}>
                      <Link href={`/portfolio/${investmentId}`} className="btn ghost">
                        View details
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
