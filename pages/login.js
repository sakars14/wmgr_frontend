import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  signInWithEmailPasswordSafe,
  signInWithGooglePopupSafe,
} from "../lib/authClient";

export default function LoginPage() {
  const router = useRouter();
  const nextPath = useMemo(() => {
    const n = router.query?.next;
    return typeof n === "string" && n.startsWith("/") ? n : "/profile";
  }, [router.query]);

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const emailSigninDisabled = true;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace(nextPath);
    });
    return () => unsub();
  }, [router, nextPath]);

  async function handleEmailSignin(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const res = await signInWithEmailPasswordSafe(email.trim(), password);
    setBusy(false);

    if (res.ok) {
      router.replace(nextPath);
    } else {
      setMsg("Could not sign in. Please check email/password.");
    }
  }

  async function handleGoogle() {
    setMsg("");
    setBusy(true);
    const res = await signInWithGooglePopupSafe();
    setBusy(false);

    if (res.ok) {
      router.replace(nextPath);
      return;
    }
    if (res.cancelled) {
      setMsg("Sign-in cancelled.");
      return;
    }
    setMsg("Google sign-in failed. Please try again.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.left}>
          <div style={styles.brandRow}>
            <Link href="/" style={styles.brandLink}>
              <span style={styles.brand}>growFOLIO</span>
            </Link>
          </div>

          <h1 style={styles.h1}>Welcome to growFOLIO</h1>
          <p style={styles.sub}>Start your experience by signing in or signing up.</p>

          <div style={styles.tabs}>
            <button
              onClick={() => setMode("signin")}
              style={{ ...styles.tabBtn, ...(mode === "signin" ? styles.tabActive : {}) }}
              type="button"
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              style={{ ...styles.tabBtn, ...(mode === "signup" ? styles.tabActive : {}) }}
              type="button"
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailSignin} style={styles.form}>
            <label style={styles.label}>
              Email Address <span style={styles.req}>*</span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{ ...styles.input, ...styles.inputDisabled }}
              type="email"
              autoComplete="email"
              required
              disabled={emailSigninDisabled}
            />

            <label style={{ ...styles.label, marginTop: 14 }}>
              Password <span style={styles.req}>*</span>
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ ...styles.input, ...styles.inputDisabled }}
              type="password"
              autoComplete="current-password"
              required
              disabled={emailSigninDisabled}
            />

            <div style={styles.helperText}>
              Email/password sign-in coming soon. Please use Google for now.
            </div>

            <button
              disabled={emailSigninDisabled || busy}
              style={{
                ...styles.primary,
                ...(emailSigninDisabled ? styles.primaryDisabled : {}),
              }}
              type="submit"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={styles.dividerRow}>
            <div style={styles.divLine} />
            <div style={styles.divText}>Or continue with</div>
            <div style={styles.divLine} />
          </div>

          <button disabled={busy} style={styles.googleBtn} onClick={handleGoogle} type="button">
            <span style={styles.googleDot}>G</span>
            Continue with Google
          </button>

          {msg ? <div style={styles.msg}>{msg}</div> : null}

          <div style={styles.footer}>
            <div>Copyright (c) growFOLIO. All rights reserved.</div>
            <div style={styles.footerLinks}>
              <a href="/terms" style={styles.footerLink}>
                Terms & Conditions
              </a>
              <span style={styles.footerSep}>|</span>
              <a href="/privacy" style={styles.footerLink}>
                Privacy & Policy
              </a>
            </div>
          </div>
        </div>

        <div style={styles.right}>
          <div style={styles.heroGrid} />
          <div style={styles.floatingCard1}>
            <div style={styles.miniTitle}>Financial Plan</div>
            <div style={styles.miniRow}>
              <span style={styles.miniDot} /> Budgeted Expenses
            </div>
            <div style={styles.miniRow}>
              <span style={styles.miniDot} /> Additional Spending
            </div>
            <div style={styles.miniRow}>
              <span style={styles.miniDot} /> In Stock
            </div>
          </div>
          <div style={styles.floatingCard2}>
            <div style={styles.miniTitle}>Capital Allocations</div>
            <div style={styles.miniValue}>INR 17,366.00</div>
            <div style={styles.miniRow}>
              <span style={styles.miniDot} /> ETFs / Gold / Debt
            </div>
          </div>
          <div style={styles.floatingCard3}>
            <div style={styles.miniTitle}>Future Funds</div>
            <div style={styles.miniValue}>INR 1,900</div>
            <div style={styles.miniRow}>
              <span style={styles.miniDot} /> Bucket List Trip
            </div>
          </div>

          <div style={styles.heroBottom}>
            <div style={styles.heroIcon}>~</div>
            <div style={styles.heroH}>
              A Unified Hub for Smarter
              <br />
              Financial Decision-Making
            </div>
            <div style={styles.heroP}>
              growFOLIO empowers you with a unified financial command center -
              delivering deep insights and a 360-degree view of your entire economic world.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACCENT = "#337576";

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "28px 18px",
    background: "#f3f6f6",
  },
  shell: {
    width: "min(1120px, 100%)",
    minHeight: "680px",
    display: "grid",
    gridTemplateColumns: "1fr 1.12fr",
    background: "#ffffff",
    borderRadius: "22px",
    overflow: "hidden",
    boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.05)",
  },
  left: {
    padding: "34px 34px 22px",
    display: "flex",
    flexDirection: "column",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandLink: { textDecoration: "none" },
  brand: { fontWeight: 800, letterSpacing: 0.2, color: "#0f2b2b", fontSize: 18 },
  h1: { margin: "26px 0 6px", fontSize: 28, fontWeight: 700, color: "#0f2b2b" },
  sub: { margin: "0 0 18px", color: "#6b7b7b", fontSize: 13.5 },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    padding: 4,
    borderRadius: 12,
    background: "#eef3f3",
    border: "1px solid rgba(0,0,0,0.06)",
    gap: 6,
    width: "min(360px, 100%)",
  },
  tabBtn: {
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 600,
    color: "#4b5b5b",
  },
  tabActive: {
    background: "#ffffff",
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    color: "#0f2b2b",
  },
  form: { marginTop: 18, width: "min(420px, 100%)" },
  label: { fontSize: 12.5, color: "#314343", fontWeight: 600, display: "block" },
  req: { color: "#c43d3d" },
  input: {
    marginTop: 8,
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    outline: "none",
    fontSize: 14,
    background: "#ffffff",
  },
  inputDisabled: {
    background: "#f2f4f4",
    color: "#7a8686",
    cursor: "not-allowed",
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: "#6b7b7b",
  },
  primary: {
    marginTop: 18,
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    background: `linear-gradient(180deg, ${ACCENT}, #2d6667)`,
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryDisabled: {
    background: "#a9b9b8",
    cursor: "not-allowed",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 18 },
  divLine: { height: 1, flex: 1, background: "rgba(0,0,0,0.10)" },
  divText: { fontSize: 12, color: "#6b7b7b" },
  googleBtn: {
    marginTop: 14,
    width: "100%",
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "#1d2b2b",
  },
  googleDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    background: "#f2f2f2",
    border: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 900,
  },
  msg: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fff6f6",
    border: "1px solid rgba(196,61,61,0.20)",
    color: "#8b2b2b",
    fontSize: 13,
    width: "min(420px, 100%)",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 22,
    fontSize: 11.5,
    color: "#7c8b8b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  footerLinks: { display: "flex", alignItems: "center", gap: 10 },
  footerLink: {
    cursor: "pointer",
    color: ACCENT,
    fontWeight: 600,
    textDecoration: "none",
  },
  footerSep: { color: "#aab5b5" },

  right: {
    position: "relative",
    background: "linear-gradient(180deg, #163f41 0%, #0f2f31 100%)",
    padding: 24,
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    opacity: 0.10,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)",
    backgroundSize: "46px 46px",
    pointerEvents: "none",
  },
  floatingCard1: {
    position: "absolute",
    top: 88,
    right: 56,
    width: 280,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  },
  floatingCard2: {
    position: "absolute",
    top: 240,
    left: 54,
    width: 320,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  },
  floatingCard3: {
    position: "absolute",
    top: 210,
    right: 42,
    width: 300,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  },
  miniTitle: { fontWeight: 800, color: "#1a2b2b", fontSize: 12, marginBottom: 8 },
  miniValue: { fontWeight: 900, color: "#0f2b2b", fontSize: 18, marginBottom: 6 },
  miniRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#425656", marginTop: 6 },
  miniDot: { width: 7, height: 7, borderRadius: 999, background: ACCENT },

  heroBottom: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 28,
    color: "#eaf2f2",
    textAlign: "left",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 900,
    marginBottom: 16,
  },
  heroH: { fontSize: 28, fontWeight: 900, lineHeight: 1.12 },
  heroP: {
    marginTop: 10,
    maxWidth: 460,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "rgba(234,242,242,0.82)",
  },
};
