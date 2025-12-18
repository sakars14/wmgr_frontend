// pages/buckets.js
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Buckets({ user, loading }) {
  const [buckets, setBuckets] = useState([]);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBuckets = useCallback(
    async (opts = { isRefresh: false }) => {
      if (!user) return;

      try {
        if (!opts.isRefresh) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setErr("");

        const token = await user.getIdToken();
        console.log("DEBUG API_BASE =", API_BASE);
        const res = await fetch(`${API_BASE}/buckets`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`API ${res.status}`);
        }

        const data = await res.json();
        const rawBuckets = Array.isArray(data.buckets) ? data.buckets : [];

        const normalized = rawBuckets.map((b, idx) => ({
          ...b,
          id: b.id || b.bucketId || `bucket-${idx + 1}`,
          name: b.name || b.title || `Bucket ${idx + 1}`,
          items: Array.isArray(b.items)
            ? b.items
            : Array.isArray(b.legs)
            ? b.legs
            : [],
          livePrice:
            typeof b.livePrice === "number" ? b.livePrice : null,
        }));

        setBuckets(normalized);
      } catch (e) {
        console.error("Error loading buckets", e);
        setErr(String(e));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    fetchBuckets({ isRefresh: false });
  }, [user, loading, fetchBuckets]);

  const reloadBuckets = () => {
    if (!user) return;
    fetchBuckets({ isRefresh: true });
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Please sign in to view buckets.</p>;
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Buckets</h1>

        <button
          className="btn ghost"
          onClick={reloadBuckets}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing…" : "Refresh prices"}
        </button>
      </div>

      {err && <p className="error">Failed to fetch: {err}</p>}

      <div className="grid">
        {buckets.map((b) => (
          <div key={b.id} className="card">
            <h2>{b.name}</h2>

            <p className="muted">
              {b.description ||
                "AI-curated basket of instruments tailored to a specific theme."}
            </p>

            <p className="muted small">
              {Array.isArray(b.items) && b.items.length > 0
                ? `${b.items.length} instruments`
                : "No instruments configured yet"}
            </p>

            <p className="price">
              {b.livePrice != null
                ? <>Approx. value: ₹{b.livePrice.toFixed(2)}</>
                : "Price unavailable"}
            </p>

            {b.priceError && (
              <p className="error small">
                Could not fetch live price. Connect Zerodha and try again.
              </p>
            )}

            <div className="card-actions">
              <Link className="btn" href={`/bucket/${b.id}`}>
                View &amp; Buy
              </Link>
            </div>
          </div>
        ))}

        {!isLoading && buckets.length === 0 && !err && (
          <p>No buckets configured yet.</p>
        )}
      </div>
    </div>
  );
}
