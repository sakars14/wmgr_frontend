// components/NavBar.js
import Link from "next/link";
import { signOutUser } from "../lib/firebase";
import { usePlan } from "../lib/usePlan";

export default function NavBar({ user }) {
  const { plan } = usePlan(user);
  const planLabel =
    plan === "none" || !plan ? "Free" : plan[0].toUpperCase() + plan.slice(1);

  return (
    <header className="header">
      <nav className="nav">
        <Link href="/" className="brand">WMGR</Link>

        <div className="links">
          <Link href="/plans">Plans</Link>
          <Link href="/buckets">Buckets</Link>
          <Link href="/connect">Connect Zerodha</Link>
        </div>

        <div className="spacer" />

        {user && <span className="badge plan">Plan: {planLabel}</span>}
        {user && <span className="user">{user.email}</span>}
        {user && (
          <button className="btn btn-ghost" onClick={signOutUser}>
            Sign out
          </button>
        )}
      </nav>
    </header>
  );
}