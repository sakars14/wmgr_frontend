// pages/plans.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '../lib/firebase';
import { loadRazorpay } from '../lib/rzp';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function Plans({ user }) {
  const [plan, setPlan] = useState('none');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  // fetch current plan (custom claim)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setPlan('none'); setEmail(''); return; }
      setEmail(user.email || '');
      const res = await auth.currentUser.getIdTokenResult(true);
      if (alive) setPlan(res.claims?.plan || 'none');
    })();
    return () => { alive = false; };
  }, [user]);

  async function setServerPlan(newPlan) {
    try {
      setBusy(true);
      const token = await auth.currentUser.getIdToken();
      const resp = await fetch(`${API_BASE}/dev/grant-plan?plan=${encodeURIComponent(newPlan)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      await auth.currentUser.reload();
      const res = await auth.currentUser.getIdTokenResult(true);
      setPlan(res.claims?.plan || 'none');
      alert(`Plan set to ${newPlan}`);
    } catch (e) {
      alert(`Failed: ${e}`);
    } finally { setBusy(false); }
  }

  async function subscribe(newPlan) {
    try {
      setBusy(true);
      const token = await auth.currentUser.getIdToken();
      // 1) create server order
      const r1 = await fetch(`${API_BASE}/billing/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: newPlan })
      });
      if (!r1.ok) throw new Error(await r1.text());
      const { key, order } = await r1.json();

      // 2) load checkout
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'WMGR',
        description: `${newPlan.toUpperCase()} Subscription`,
        order_id: order.id,
        prefill: { email: user.email || '' },
        theme: { color: '#0a3d62' },
        handler: async (response) => {
          // 3) confirm on server
          try {
            const r2 = await fetch(`${API_BASE}/billing/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: newPlan
              })
            });
            if (!r2.ok) throw new Error(await r2.text());
            // refresh token -> plan pill updates immediately
            await auth.currentUser.reload();
            const res = await auth.currentUser.getIdTokenResult(true);
            setPlan(res.claims?.plan || 'none');
            alert('Subscription activated!');
          } catch (e) {
            alert(`Confirm failed: ${e}`);
          }
        }
      });

      rzp.open();
    } catch (e) {
      alert(`Subscribe failed: ${e}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="container">
      <h1>Subscription plans</h1>
      <p>
        <strong>Your email:</strong> {email || '—'} &nbsp;|&nbsp;
        <strong>Current plan:</strong> {plan}
      </p>

      <div className="plans">
        <div className="card">
          <h2>Standard</h2>
          <p>₹199/month</p>
          <p>Access to 5 basic buckets.</p>
          {isAdmin ? (
            <button disabled={busy} onClick={() => setServerPlan('standard')}>
              {busy ? 'Applying…' : 'Make me Standard (admin)'}
            </button>
          ) : (
            <button className="btn" disabled={busy} onClick={() => subscribe('standard')}>
              {busy ? 'Processing…' : 'Subscribe'}
            </button>
          )}
        </div>

        <div className="card">
          <h2>Pro</h2>
          <p>₹499/month</p>
          <p>Standard + 3 advanced buckets.</p>
          {isAdmin ? (
            <button disabled={busy} onClick={() => setServerPlan('pro')}>
              {busy ? 'Applying…' : 'Make me Pro (admin)'}
            </button>
          ) : (
            <button className="btn" disabled={busy} onClick={() => subscribe('pro')}>
              {busy ? 'Processing…' : 'Subscribe'}
            </button>
          )}
        </div>

        <div className="card">
          <h2>Max</h2>
          <p>₹999/month</p>
          <p>All 10 buckets + future alpha sets.</p>
          {isAdmin ? (
            <button disabled={busy} onClick={() => setServerPlan('max')}>
              {busy ? 'Applying…' : 'Make me Max (admin)'}
            </button>
          ) : (
            <button className="btn" disabled={busy} onClick={() => subscribe('max')}>
              {busy ? 'Processing…' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/buckets">Go to buckets →</Link>
      </div>

      <style jsx>{`
        .plans { display:grid; gap:20px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); margin-top:16px; }
        .card { border:1px solid #333; border-radius:12px; padding:16px; background:rgba(255,255,255,0.02); }
        .card h2{ margin:0 0 8px; }
        .card p{ margin:4px 0; }
        .btn{ margin-top:10px; padding:8px 12px; border-radius:8px; border:1px solid #555; background:#111; color:#eee; cursor:pointer; }
        .btn:disabled{ opacity:.5; cursor:not-allowed; }
      `}</style>
    </div>
  );
}