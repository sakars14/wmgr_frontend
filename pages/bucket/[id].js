// pages/bucket/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { usePlan } from "../../lib/usePlan";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PLAN_LIMIT = { none: 0, standard: 5, pro: 8, max: 10 };

// try to parse a “number” from id/name if rank not provided
function deriveRank(obj, fallback = 999) {
  const text = (obj?.id || obj?.name || "").toString();
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : fallback;
}

export default function BucketDetail({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [bucket, setBucket] = useState(null);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const { plan } = usePlan(user);

  const limit = PLAN_LIMIT[plan] ?? 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user || !id) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/buckets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        const normalized = {
          ...data,
          id: data.id ?? data.bucketId ?? id,
          name: data.name ?? data.title ?? id,
          items: Array.isArray(data.items) ? data.items : (Array.isArray(data.legs) ? data.legs : []),
        };
        if (alive) setBucket(normalized);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    })();
    return () => { alive = false; };
  }, [user, id]);

  const locked = (() => {
    if (!bucket) return true;
    const rank = bucket.rank ?? deriveRank(bucket);
    return rank > limit;
  })();

  const buy = async () => {
    if (!bucket) return;
    setPlacing(true); setErr(""); setResult(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const legs = (bucket.items ?? []).map(i => ({
        exchange: i.exchange ?? "NSE",
        symbol: i.symbol,
        qty: Number(qty),
        product: i.product ?? "CNC",
        priceType: "MARKET",
        limitPrice: null
      }));
      const payload = {
        bucketId: bucket.id,
        legs,
        idempotencyKey: `${bucket.id}-${Date.now()}`
      };
      const res = await fetch(`${API_BASE}/orders/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      setResult(body);
    } catch (e) {
      setErr(String(e));
    } finally {
      setPlacing(false);
    }
  };

  if (!user) return <p>Please sign in.</p>;
  if (err && !bucket) return <p style={{ color: "tomato" }}>{err}</p>;
  if (!bucket) return <p>Loading…</p>;

  return (
    <div className="container">
      <h1>{bucket.name}</h1>
      <p className="muted">
        {(bucket.items ?? []).map(i => `${i.exchange ?? "NSE"}:${i.symbol}`).join(", ")}
      </p>

      {locked && (
        <div className="alert">
          🔒 This bucket is locked for your plan ({plan || "free"}).{" "}
          <a href="/plans">Upgrade</a> to access it.
        </div>
      )}

      <label>
        Quantity per leg:&nbsp;
        <input
          type="number"
          min={1}
          value={qty}
          onChange={e => setQty(e.target.value)}
          style={{ width: 100 }}
          disabled={locked}
        />
      </label>

      <div style={{ marginTop: 12 }}>
        <button disabled={placing || locked} onClick={buy}>
          {placing ? "Placing…" : "Buy bucket"}
        </button>
      </div>

      {err && <pre style={{ color: "tomato", marginTop: 16 }}>{err}</pre>}
      {result && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}