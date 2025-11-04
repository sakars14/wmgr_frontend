import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function Admin({ user }) {
  const [data, setData] = useState(null);
  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isAdmin) return;
      const token = await auth.currentUser.getIdToken();
      const r = await fetch(`${API_BASE}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` }});
      if (r.ok && alive) setData(await r.json());
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  if (!isAdmin) return <div className="container"><p>Not allowed.</p></div>;
  if (!data) return <div className="container"><p>Loading…</p></div>;

  return (
    <div className="container">
      <h1>Admin metrics</h1>
      <div className="card">
        <h3>Active subscriptions</h3>
        <p>Standard: {data.active.standard}</p>
        <p>Pro: {data.active.pro}</p>
        <p>Max: {data.active.max}</p>
      </div>

      <div className="card">
        <h3>Recent</h3>
        <ul>
          {data.last10.map((x, i) => (
            <li key={i}>{x.plan} — {x.status} — ₹{(x.amount/100).toFixed(2)} — {x.uid?.slice(0,6)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}