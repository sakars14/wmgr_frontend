// pages/buckets.js
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { auth } from "../lib/firebase";
import { usePlan } from "../lib/usePlan";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PLAN_LIMIT = { none: 0, standard: 5, pro: 8, max: 10 };

export default function Buckets({ user }) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const { plan } = usePlan(user);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) { setLoading(false); return; }
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/buckets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();

        // normalize & add an index rank (1..N) for gating
        const safe = (data.buckets ?? []).map((b, idx) => ({
          ...b,
          id: b.id ?? b.bucketId ?? b.name ?? `bucket-${idx + 1}`,
          name: b.name ?? b.title ?? `Bucket ${idx + 1}`,
          items: Array.isArray(b.items) ? b.items : (Array.isArray(b.legs) ? b.legs : []),
          rank: idx + 1,
        }));
        if (alive) setBuckets(safe);
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const limit = PLAN_LIMIT[plan] ?? 0;
  const unlockedCount = useMemo(() => Math.min(limit, buckets.length), [limit, buckets]);

  if (!user) return <p>Please sign in.</p>;
  if (loading) return <p>Loading buckets…</p>;
  if (err) return <p style={{ color: "tomato" }}>Failed to fetch: {err}</p>;

  return (
    <div className="container">
      <div className="page-head">
        <h1>Buckets</h1>
        <span className="badge">
          Unlocked {unlockedCount}/{buckets.length}
        </span>
      </div>

      <div className="grid">
        {buckets.map((b) => {
          const locked = b.rank > limit;
          return (
            <div className={`card ${locked ? "locked" : ""}`} key={b.id}>
              <div className="card-head">
                <h3 className="card-title">{b.name}</h3>
                <span className={`chip ${locked ? "chip-locked" : "chip-ok"}`}>
                  {locked ? "Locked" : "Unlocked"}
                </span>
              </div>

              <p className="muted">
                {(b.items ?? []).map(i => i.symbol).join(", ")}
              </p>

              <div className="card-actions">
                {locked ? (
                  <>
                    <span className="lock">🔒</span>
                    <Link className="btn ghost" href="/plans">Upgrade</Link>
                  </>
                ) : (
                  <Link className="btn" href={`/bucket/${b.id}`}>Open</Link>
                )}
              </div>

              {locked && <div className="lock-overlay" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}