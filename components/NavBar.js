// components/NavBar.js
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, signOutUser } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import styles from "../styles/NavBar.module.css";

const ACCENT = "#337576";

export default function NavBar({ user, onSignIn, onSignOut }) {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [platform, setPlatform] = useState("investment");

  const [profileName, setProfileName] = useState("");
  const [initials, setInitials] = useState("");
    
    useEffect(() => {
      const unsub = onAuthStateChanged(auth, async (u) => {
        setCurrentUser(u || null);
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
    if (typeof window === "undefined") return;
    const host = window.location.hostname || "";
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const next = host.startsWith("app.") || isLocal ? "investment" : "growfolio";
    setPlatform(next);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const targetUser = user || auth.currentUser;
      if (!targetUser) {
        if (alive) setIsAdmin(false);
        return;
      }
      try {
        const token = await targetUser.getIdToken();
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
  
  const effectiveUser = user || currentUser;
  const navItems = useMemo(
    () => [
      { label: "Plans", href: "/plans", adminOnly: true },
      { label: "Buckets", href: "/buckets", adminOnly: true },
      { label: "Admin", href: "/admin", adminOnly: true },
    ],
    []
  );

  const isActive = (href) => {
    if (href === "/") return router.pathname === "/";
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  const handlePlatformSelect = (next) => {
    setPlatform(next);
    if (next === "growfolio") {
      window.location.href = "https://growfolio.com";
    } else {
      router.push("/");
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleSignOut = () => {
    if (typeof onSignOut === "function") {
      onSignOut();
    } else {
      signOutUser();
    }
  };

  return (
    <header className={styles.header} style={{ "--accent": ACCENT }}>
      <div className="mx-auto max-w-6xl px-6">
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandText}>growFOLIO</span>
            <span className={styles.brandLabel}>Investment Platform</span>
          </Link>

          <div className={styles.centerNav}>
            {navItems
              .filter((item) => (item.adminOnly ? isAdmin : true))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
                >
                  {item.label}
                </Link>
              ))}
          </div>

          <div className={styles.spacer} />

          <div className={styles.right}>
            <div className={styles.platformToggle}>
              <button
                type="button"
                className={`${styles.platformButton} ${
                  platform === "growfolio" ? styles.platformActive : ""
                }`}
                onClick={() => handlePlatformSelect("growfolio")}
              >
                Growfolio
              </button>
              <button
                type="button"
                className={`${styles.platformButton} ${
                  platform === "investment" ? styles.platformActive : ""
                }`}
                onClick={() => handlePlatformSelect("investment")}
              >
                Investment Platform
              </button>
            </div>

            {effectiveUser ? (
              <>
                <Link href="/profile" className={styles.profile}>
                  <span className={styles.avatar}>{initials}</span>
                  <span className={styles.profileName}>{profileName || "User"}</span>
                </Link>
                <button type="button" className={styles.authButton} onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className={styles.authButton} onClick={handleSignIn}>
                Sign in
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
