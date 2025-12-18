// pages/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

export default function LandingPage() {
    const [user, setUser] = useState(null);

    useEffect(() => {
      const unsub = auth.onAuthStateChanged((u) => setUser(u));
      return () => unsub();
    }, []);
    
  return (
    <div className="landing-page">
      <main>
        {/* HERO SECTION */}
        <section id="home" className="landing-main">
          <div className="landing-hero-text">
            <p className="landing-eyebrow">Plan · Invest · Track</p>
            <h1 className="landing-hero-title">
              Grow your wealth with curated investment buckets
            </h1>
            <p className="landing-hero-body">
              growFOLIO analyses your income, expenses, assets and goals to
              build your money profile. We then recommend curated investment
              buckets that match your risk level and help you invest via Zerodha.
            </p>

            <div className="landing-cta-row">
              <Link href="/login" className="primary-btn">
                Login to continue
              </Link>
              {user && (
                <Link href="/plans" className="ghost-btn">
                  View plans
                </Link>
              )}
            </div>


            <p className="landing-note">
              New here? Complete a one-time questionnaire, get a personalised
              risk profile, and see buckets aligned to your goals.
            </p>
          </div>


        </section>

        {/* ABOUT SECTION (placeholder) */}
        <section id="about" className="landing-section">
          <h2>About growFOLIO</h2>
          <p>
            growFOLIO is a money-management layer on top of your broker
            accounts. We don&apos;t hold your money — instead, we help you
            understand where it is invested, how it is performing, and what
            changes can move you closer to your goals.
          </p>
        </section>

        {/* SERVICES SECTION (placeholder) */}
        <section id="services" className="landing-section">
          <h2>What we do for you</h2>
          <ul className="landing-bullets">
            <li>Build your complete financial profile in one place.</li>
            <li>Classify you as conservative, balanced or aggressive investor.</li>
            <li>
              Recommend curated investment buckets mapped to your risk &amp;
              goals.
            </li>
            <li>Help you execute easily via your Zerodha account.</li>
          </ul>
        </section>

        {/* PORTFOLIO SECTION (placeholder) */}
        <section id="portfolio" className="landing-section">
          <h2>Curated buckets, not random tips</h2>
          <p>
            Instead of chasing stock tips, you invest into structured buckets
            built around themes like safety, growth, income, and long-term
            goals. Each bucket has a clear allocation and risk level.
          </p>
        </section>

        {/* CONTACT SECTION (placeholder) */}
        <section id="contact" className="landing-section">
          <h2>Contact &amp; support</h2>
          <p>
            Have questions or want to partner with us? Reach out via the Support
            section once you&apos;re logged in, or drop us an email from the
            app. More detailed contact options will appear here soon.
          </p>
        </section>

        <footer className="landing-footer">
          <span>© {new Date().getFullYear()} growFOLIO · All rights reserved.</span>
          <span className="landing-footer-links">
            <Link href="/login">Login</Link>
            <Link href="/plans">Plans</Link>
            <Link href="/buckets">Buckets</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
