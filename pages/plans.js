// pages/plans.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import styles from "../styles/PlansPage.module.css";

const PLANS = [
  {
    id: "standard",           // backend code
    slug: "safety",
    name: "Safety plan",
    label: "Low risk · Capital protection",
    price: 1000,
    tag: "Best for conservative investors",
    features: [
      "Access to low-volatility, capital-protection model portfolios",
      "Suggested buckets tuned for emergency fund & steady income",
      "Guidance on plugging protection gaps (insurance, buffer)",
    ],
    allocation: [
      { label: "Equity", value: "20%" },
      { label: "Debt & fixed income", value: "60%" },
      { label: "Gold / alternatives", value: "20%" },
    ],
  },
  {
    id: "pro",
    slug: "balanced",
    name: "Balanced plan",
    label: "Moderate risk · Steady growth",
    price: 3000,
    tag: "Recommended for most investors",
    features: [
      "Core diversified portfolio across equity, debt and gold",
      "Model buckets aligned with your goals and time horizon",
      "Ongoing allocation view so you know when to rebalance",
    ],
    allocation: [
      { label: "Equity", value: "50%" },
      { label: "Debt & fixed income", value: "40%" },
      { label: "Gold / alternatives", value: "10%" },
    ],
  },
  {
    id: "max",
    slug: "growth",
    name: "Growth plan",
    label: "Higher risk · Higher potential",
    price: 5000,
    tag: "For aggressive, long-term investors",
    features: [
      "High-growth, equity-oriented model portfolios",
      "Buckets tilted towards long-term themes and sectors",
      "Clear risk view so you know how much downside to expect",
    ],
    allocation: [
      { label: "Equity", value: "75%" },
      { label: "Debt & fixed income", value: "20%" },
      { label: "Gold / alternatives", value: "5%" },
    ],
  },
];


// Load Razorpay script once
async function loadRazorpayScript() {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PlansPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recommendedPlanId, setRecommendedPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [message, setMessage] = useState("");

  // Load user + profile + mark recommended plan from riskQuiz
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace("/");
        return;
      }

      setUser(u);
      try {
        const ref = doc(db, "clientProfiles", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);

          const riskLabel = data.riskQuiz?.riskLabel || "";
          if (riskLabel === "Conservative") {
            setRecommendedPlanId("standard");
          } else if (riskLabel === "Balanced") {
            setRecommendedPlanId("pro");
          } else if (riskLabel) {
            // Aggressive / Outlier etc → growth
            setRecommendedPlanId("max");
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setMessage("Could not load your profile. You can still choose a plan.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleBuy = async (planId) => {
    try {
      setMessage("");
      setBusyPlanId(planId);

      const ok = await loadRazorpayScript();
      if (!ok) {
        setMessage("Unable to load Razorpay. Check your connection and try again.");
        setBusyPlanId(null);
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace("/");
        return;
      }

      const token = await currentUser.getIdToken();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan: planId }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create order");
      }

      const { key, order } = data;
      const planDef = PLANS.find((p) => p.id === planId);

      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Growfolio",
        description: planDef ? planDef.name : "Investment plan",
        order_id: order.id,
        prefill: {
          name: profile?.personal?.name || "",
          email: currentUser.email || "",
        },
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try {
            const confirmRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/confirm`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: planId,
                }),
              }
            );

            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) {
              throw new Error(
                confirmData.detail || "Payment confirmation failed"
              );
            }

            setMessage(
              `Payment successful. Your ${planDef?.name || "plan"} is active.`
            );
          } catch (err) {
            console.error(err);
            setMessage(
              err.message ||
                "Payment captured but confirmation failed. Please contact support."
            );
          } finally {
            setBusyPlanId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setBusyPlanId(null);
            setMessage("Payment popup closed.");
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      setBusyPlanId(null);
      setMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.headingRow}>
          <div>
            <h1 className={styles.title}>Investment plans</h1>
            <p className={styles.subtitle}>
              Pick a plan based on your comfort with risk. You only pay once for
              a detailed, personalised allocation.
            </p>
          </div>
          {profile?.riskQuiz?.riskLabel && (
            <div className={styles.riskChip}>
              <span>{profile.riskQuiz.riskLabel} investor</span>
              {profile.riskQuiz.totalScore != null && (
                <span className={styles.riskScore}>
                  {" "}
                  · Score {profile.riskQuiz.totalScore}
                </span>
              )}
            </div>
          )}
        </header>

        {loading ? (
          <p className={styles.info}>Loading your profile…</p>
        ) : (
          <section className={styles.cardsGrid}>
            {PLANS.map((plan) => {
              const isRecommended = plan.id === recommendedPlanId;
              const busy = busyPlanId === plan.id;
              return (
                <article
                  key={plan.id}
                  className={`${styles.planCard} ${
                    isRecommended ? styles.planCardHighlight : ""
                  }`}
                >
                  <div className={styles.planHeader}>
                    <h2 className={styles.planName}>{plan.name}</h2>
                    {isRecommended && (
                      <span className={styles.recommendedTag}>Recommended</span>
                    )}
                  </div>
                  <p className={styles.planLabel}>{plan.label}</p>

                  <div className={styles.priceRow}>
                    <span className={styles.priceSymbol}>₹</span>
                    <span className={styles.priceValue}>{plan.price}</span>
                    <span className={styles.pricePeriod}>one-time</span>
                  </div>

                  <p className={styles.planTag}>{plan.tag}</p>

                  {/* top separator */}
                  <div className={styles.cardDivider} />

                  {/* teaser bullets */}
                  <ul className={styles.featuresList}>
                    {plan.features.map((text) => (
                      <li key={text} className={styles.featureItem}>
                        {text}
                      </li>
                    ))}
                  </ul>

                  {/* second separator before allocation */}
                  <div className={styles.cardDivider} />

                  {/* high-level allocation preview */}
                  <ul className={styles.allocationList}>
                    {plan.allocation.map((item) => (
                      <li
                        key={item.label}
                        className={styles.allocationItem}
                      >
                        <span>{item.label}</span>
                        <span className={styles.allocationValue}>
                          {item.value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className="btn"
                    onClick={() => handleBuy(plan.id)}
                    disabled={busy}
                  >
                    {busy ? "Processing…" : "Choose this plan"}
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {message && <p className={styles.statusMessage}>{message}</p>}
      </main>
    </div>
  );
}
