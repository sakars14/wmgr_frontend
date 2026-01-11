import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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

const formatPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${(num * 100).toFixed(1)}%`;
};

export default function PortfolioDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investment, setInvestment] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u || null);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loadingUser || !id) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/investments/me/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load investment");
        }
        if (alive) {
          setInvestment(data?.investment || null);
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Failed to load investment");
          setInvestment(null);
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
  }, [id, user, loadingUser]);

  const legs = Array.isArray(investment?.legs) ? investment.legs : [];
  const bucketName = investment?.bucketName || investment?.bucketId || "Bucket";

  return (
    <>
      <NavBar user={user} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        {loading ? (
          <div>Loading...</div>
        ) : !user ? (
          <div>Please sign in.</div>
        ) : error ? (
          <div style={{ color: "#b91c1c" }}>{error}</div>
        ) : !investment ? (
          <div>Investment not found.</div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ marginBottom: 6 }}>{bucketName}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#6b7280" }}>
                <div>Amount: {formatInr(investment.amount)}</div>
                <div>Status: {investment.status || "-"}</div>
                <div>Created: {formatDate(investment.createdAt)}</div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>
                Holdings
              </div>
              {legs.length === 0 ? (
                <div style={{ padding: 14, color: "#6b7280" }}>No legs recorded.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", fontSize: 12, color: "#6b7280" }}>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Instrument</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Weight</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Allocated</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Qty</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Order ID</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Order Status</th>
                        <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legs.map((leg, idx) => (
                        <tr key={`${leg.instrument || leg.symbol || idx}`}>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {leg.instrument || `${leg.exchange || "NSE"}:${leg.symbol || ""}`}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {formatPercent(leg.weight)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {formatInr(leg.allocatedAmount)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {Number.isFinite(Number(leg.qtyRequested)) ? leg.qtyRequested : "-"}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {leg.orderId || "-"}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {leg.orderStatus || "-"}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            {Number.isFinite(Number(leg.avgPrice)) ? formatInr(leg.avgPrice) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
              Live performance will appear once live market data is enabled.
            </div>
          </>
        )}
      </div>
    </>
  );
}
