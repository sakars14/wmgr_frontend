// pages/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, signInGoogle, db } from "../lib/firebase";
import styles from "../styles/AuthPage.module.css";

export default function Home() {
  const [tab, setTab] = useState("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // 🔍 Central auth listener: decides /onboarding vs /buckets
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return; // not logged in yet

      setPending(true);
      setError("");

      try {
        let snap;

        // If db.collection exists, it's likely compat-style Firestore
        if (db && typeof db.collection === "function") {
          // compat: db.collection("clientProfiles").doc(uid).get()
          snap = await db
            .collection("clientProfiles")
            .doc(u.uid)
            .get();
        } else {
          // modular: doc(db, "clientProfiles", uid) + getDoc()
          const ref = doc(db, "clientProfiles", u.uid);
          snap = await getDoc(ref);
        }

        // Normalise "exists" between compat (.exists) and modular (.exists())
        const exists =
          typeof snap.exists === "function"
            ? snap.exists()
            : !!snap.exists;

        if (exists) {
          router.replace("/buckets");
        } else {
          router.replace("/onboarding");
        }
      } catch (e) {
        console.error("Profile check failed", e);
        setError(
          "We had trouble loading your profile. Please refresh and try again."
        );
      } finally {
        setPending(false);
      }
    });

    return () => unsub();
  }, [router]);

  // Google sign-in handler: auth listener above will route appropriately
  const handleGoogle = async () => {
    setError("");
    setPending(true);
    try {
      await signInGoogle();
      // No router.push here – routing is handled by onAuthStateChanged
    } catch (e) {
      console.error("Google auth failed", e);
      setError(
        "We could not sign you in with Google right now. Please try again."
      );
      setPending(false);
    }
  };

  const heading = tab === "signin" ? "Welcome Back" : "Create Account";
  const subtitle =
    tab === "signin"
      ? "Sign in to see your buckets and keep tracking performance."
      : "Join Growfolio with your Google account, answer a few one-time questions, and start exploring buckets.";

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.formPanel}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark} aria-hidden="true">
              <span className={styles.logoArrow} />
            </div>
            <span className={styles.logoText}>Growfolio</span>
          </div>

          <div className={styles.heroCopy}>
            <h1>{heading}</h1>
            <p>{subtitle}</p>
          </div>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              className={`${styles.tab} ${
                tab === "signin" ? styles.activeTab : ""
              }`}
              onClick={() => setTab("signin")}
              aria-pressed={tab === "signin"}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`${styles.tab} ${
                tab === "signup" ? styles.activeTab : ""
              }`}
              onClick={() => setTab("signup")}
              aria-pressed={tab === "signup"}
            >
              Signup
            </button>
          </div>

          <div className={styles.inputCard} aria-live="polite">
            <div className={styles.icon}>
              <svg
                viewBox="0 0 22 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="1"
                  y="2"
                  width="20"
                  height="12"
                  rx="2.4"
                  stroke="#123a66"
                  strokeWidth="1.6"
                />
                <path
                  d="M2.5 3.5L11 9.2L19.5 3.5"
                  stroke="#123a66"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className={styles.inputMeta}>
              <span className={styles.inputLabel}>Google Account</span>
              <span className={styles.inputValue}>
                Continue with your Gmail
              </span>
            </div>
            <div className={styles.statusIcon} aria-hidden="true">
              <svg
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="9" cy="9" r="8" fill="#2f8b57" opacity="0.08" />
                <path
                  d="M5 9.1l2.3 2.4L13 6.8"
                  stroke="#2f8b57"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGoogle}
            disabled={pending}
          >
            {pending
              ? "Talking to Google..."
              : tab === "signin"
              ? "Continue"
              : "Create account"}
          </button>

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.disclaimer}>
            We use Google Sign-In only. New customers will see a short one-time
            questionnaire before accessing their buckets.
          </p>
          <p className={styles.subtleText}>
            Join Growfolio to follow curated investment buckets, track
            performance, and stay informed with a focused dashboard.
          </p>
        </div>

        <div className={styles.artPanel} aria-hidden="true">
          <img src="/growfolio-safe.svg" alt="" className={styles.artImage} />
        </div>
      </div>
    </section>
  );
}
