// components/NavBar.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, signOutUser } from "../lib/firebase";
import { usePlan } from "../lib/usePlan";
import { doc, getDoc } from "firebase/firestore";



export default function NavBar({ user }) {
  const { plan } = usePlan(user);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  // or hard-code for now: const adminEmail = "srivastavasakar@gmail.com";
  const isAdmin = user && user.email === adminEmail;

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
          <Link href="/connect">Connect Zerodha</Link>
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