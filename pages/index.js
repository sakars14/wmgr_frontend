// pages/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, signInGoogle, signOutUser } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <section>
      <h1 style={{ marginBottom: 8 }}>Welcome to WMGR</h1>
      <p style={{ marginBottom: 24 }}>
        Explore plans, view buckets, and connect your Zerodha account to invest.
      </p>

      {!user ? (
        <button onClick={signInGoogle} style={{ padding: "8px 12px" }}>
          Sign in with Google
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/plans"><button>View Plans</button></Link>
          <Link href="/buckets"><button>View Buckets</button></Link>
          <Link href="/connect"><button>Connect Zerodha</button></Link>
          <button onClick={signOutUser}>Sign out</button>
        </div>
      )}
    </section>
  );
}