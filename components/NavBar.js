// components/NavBar.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, signOutUser } from "../lib/firebase";
import { usePlan } from "../lib/usePlan";
import { doc, getDoc } from "firebase/firestore";



export default function NavBar({ user }) {
  const { plan } = usePlan(user);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [isAdmin, setIsAdmin] = useState(false);

  const planLabel =
    plan === "none" || !plan ? "Free" : plan[0].toUpperCase() + plan.slice(1);

  const [profileName, setProfileName] = useState("");
  const [initials, setInitials] = useState("");
    
    useEffect(() => {
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setProfileName("");
          setInitials("");
          return;
        }
    
        try {
          const ref = doc(db, "clientProfiles", u.uid);
          const snap = await getDoc(ref);
    
          let name = "";
    
          if (snap.exists()) {
            const personal = snap.data().personal || {};
            name = personal.name || "";
          }
    
          // fallbacks
          if (!name && u.displayName) name = u.displayName;
          if (!name && u.email) name = u.email.split("@")[0];
    
          const first = (name || "").trim().split(/\s+/)[0] || "User";
          const init = first[0].toUpperCase();
    
          setProfileName(first);
          setInitials(init);
        } catch (e) {
          console.error("Failed to load profile name", e);
          const raw = (auth.currentUser?.email || "").split("@")[0] || "User";
          setProfileName(raw);
          setInitials(raw[0].toUpperCase());
        }
      });
    
      return () => unsub();
    }, []);   

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/dev/whoami`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (alive) {
          const raw = data?.is_admin;
          const isAdminVal = Array.isArray(raw) ? !!raw[0] : !!raw;
          setIsAdmin(isAdminVal);
        }
      } catch (e) {
        if (alive) setIsAdmin(false);
      }
    })();
    return () => { alive = false; };
  }, [user, API_BASE]);
  
  return (
    <header className="header">
      <nav className="nav">
        <Link href="/" className="brand">WMGR</Link>

        <div className="links">
          <Link href="/plans">Plans</Link>
          <Link href="/buckets">Buckets</Link>
          {isAdmin && (
            <Link href="/admin">Admin</Link>
          )}
        </div>

        <div className="spacer" />

        {/*user && <span className="badge plan">Plan: {planLabel}</span>*/}
        {user && <Link href="/profile" className="topbar-profile">
  <div className="topbar-avatar">{initials}</div>
  <span className="topbar-name">{profileName}</span>
</Link>}
        {user && (
          <button className="btn btn-ghost" onClick={signOutUser}>
            Sign out
          </button>
        )}
      </nav>
    </header>
  );
}
