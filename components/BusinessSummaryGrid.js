import { useEffect, useState } from "react";
import styles from "../styles/Landing.module.css";

const SLIDES = [
  "AI Planner that maps your life to money decisions",
  "Buckets that match your risk and goals - not random tips",
  "Track investments, performance, and next actions",
];

export default function BusinessSummaryGrid({ onLogin, onAppointments }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.businessPage}>
      <div className={styles.businessMain}>
        <section className={styles.businessWrap}>
          <div className={styles.businessGrid}>
            <div className={styles.businessColumn}>
              <div className={`${styles.card} ${styles.cardL1}`}>
                <h3 className={styles.cardTitle}>What can you do with growFOLIO?</h3>
                <ul className={styles.cardList}>
                  <li>AI Planner (personalized plan)</li>
                  <li>Budget &amp; surplus tracking</li>
                  <li>Goal-based investing roadmap</li>
                  <li>Curated investment buckets</li>
                  <li>Track performance in one place</li>
                </ul>
              </div>

              <div className={`${styles.card} ${styles.cardL2}`}>
                <h3 className={styles.cardTitle}>Plans built from your profile</h3>
                <p className={styles.cardBody}>
                  A short onboarding creates your risk score and pinpoints the one bucket
                  you should start with on the Plans page.
                </p>
                <div className={styles.chipRow}>
                  <span className={styles.chip}>Risk score</span>
                  <span className={styles.chip}>Goals</span>
                  <span className={styles.chip}>Cashflow</span>
                </div>
              </div>
            </div>

            <div className={`${styles.businessColumn} ${styles.businessColumnCenter}`}>
              <div className={`${styles.card} ${styles.cardB}`}>
                <div className={styles.carousel}>
                  <div className={styles.carouselText}>{SLIDES[active]}</div>
                  <div className={styles.dotRow}>
                    {SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`${styles.dot} ${active === idx ? styles.dotActive : ""}`}
                        onClick={() => setActive(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.businessColumn}>
              <button
                type="button"
                className={`${styles.cardButton} ${styles.cardR1}`}
                onClick={onAppointments}
              >
                <h3 className={styles.cardTitle}>Book your appointment</h3>
                <p className={styles.cardBody}>
                  Talk to an advisor for setup, planning, or reviews.
                </p>
                <div className={styles.cardCta}>Schedule (coming soon)</div>
              </button>

              <button
                type="button"
                className={`${styles.cardButton} ${styles.cardR2} ${styles.cardR2Primary}`}
                onClick={onLogin}
              >
                <h3 className={styles.cardTitle}>Come grow your portfolio with us</h3>
                <p className={styles.cardBody}>
                  Login to create your profile and get your recommended bucket.
                </p>
                <div className={styles.cardCta}>Login</div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
