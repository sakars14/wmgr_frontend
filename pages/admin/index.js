// pages/admin/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../../lib/firebase";
import { useAdmin } from "../../lib/useAdmin";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Admin({ user }) {
  const router = useRouter();
  const isAdmin = useAdmin(user);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (!isAdmin) return; // will show guard below
      try {
        const token = await auth.currentUser.getIdToken();
        const r = await fetch(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 403) { setErr("Not allowed"); return; }
        const data = await r.json();
        setStats(data);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [user, isAdmin]);

  if (!user) return <div className="container"><p>Loading…</p></div>;
  if (!isAdmin) return <div className="container"><p>Not authorized.</p></div>;

  return (
    <div className="container">
      <h1>Admin</h1>
      {err && <p className="error">{err}</p>}
      {stats ? (
        <ul>
          <li>Users: {stats.users}</li>
          <li>Subscriptions: {stats.subscriptions}</li>
          <li>Order groups: {stats.orderGroups}</li>
        </ul>
      ) : <p>Loading stats…</p>}

      <hr />
      <p><strong>Coming next:</strong> create/edit buckets here → changes will reflect on the Buckets page for users. Also add analytics (MRR, active subs, orders, etc.).</p>
    </div>
  );
}
