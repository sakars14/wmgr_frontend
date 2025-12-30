// pages/buckets.js
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Buckets({ user, loading }) {
  const [buckets, setBuckets] = useState([]);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendedBuckets, setRecommendedBuckets] = useState([]);
  const [recommendedRiskBand, setRecommendedRiskBand] = useState("");
  const [recommendedErr, setRecommendedErr] = useState("");
  const [recommendedLoading, setRecommendedLoading] = useState(false);

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

  const fetchRecommended = useCallback(async () => {
    if (!user) return;
    try {
      setRecommendedLoading(true);
      setRecommendedErr("");
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/model-buckets/recommended`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || `API ${res.status}`);
      }
      setRecommendedRiskBand(data?.recommendedRiskBand || "");
      setRecommendedBuckets(Array.isArray(data?.buckets) ? data.buckets : []);
    } catch (e) {
      console.error("Error loading recommended buckets", e);
      setRecommendedErr(String(e));
      setRecommendedBuckets([]);
      setRecommendedRiskBand("");
    } finally {
      setRecommendedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    fetchRecommended();
  }, [user, loading, fetchRecommended]);

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

  const mixText = (assetMix) => {
    if (!assetMix || typeof assetMix !== "object") return "";
    const parts = [
      ["Equity", assetMix.equity],
      ["Debt", assetMix.debt],
      ["Gold", assetMix.gold],
      ["Cash", assetMix.cash],
    ]
      .filter(([, value]) => Number(value) > 0)
      .map(([label, value]) => `${label} ${Math.round(Number(value) * 100)}%`);
    return parts.join(" · ");
  };

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

      {recommendedErr && <p className="error">Recommended buckets unavailable: {recommendedErr}</p>}

      {recommendedBuckets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Recommended for you</h2>
            {recommendedLoading && <span className="muted small">Loading…</span>}
          </div>
          <div className="grid">
            {recommendedBuckets.map((bucket) => {
              const isRecommended = bucket.riskBand === recommendedRiskBand;
              return (
                <div key={bucket.bucketId} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ marginBottom: 0 }}>{bucket.name || bucket.bucketId}</h2>
                    {isRecommended && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534" }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="muted small">{bucket.riskBand}</p>
                  {bucket.description && <p className="muted">{bucket.description}</p>}
                  {bucket.assetMix && (
                    <p className="muted small">{mixText(bucket.assetMix)}</p>
                  )}
                  <div className="card-actions">
                    <Link className="btn" href={`/bucket/${bucket.bucketId}?source=model`}>
                      View bucket
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
