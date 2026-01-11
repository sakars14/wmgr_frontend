import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import styles from "../styles/ProfilePage.module.css";
import { formatINR, parseINR } from "../lib/money";
import { fetchZerodhaStatus } from "../lib/zerodhaStatus";

const CASH_FLOW_TOTAL_KEYS = [
  "rent",
  "maintainence",
  "groceries",
  "utilities",
  "health",
  "gymPersonalCare",
  "dinningOut",
  "fuel",
  "houseHelp",
  "entertainment",
  "parentsExpense",
  "miscExpense",
  "others",
];

const ASSET_TOTAL_KEYS = [
  "selfOccupiedHouse",
  "house2",
  "bankBalance1",
  "bankBalance2",
  "directEquity",
  "equityMf",
  "debtMf",
  "bonds",
  "goldSilver",
  "esops",
  "reit",
  "realEstate",
  "pms",
  "aif",
  "crypto",
  "startupInvestments",
  "fds",
  "rds",
  "postOfficeSchemes",
  "ppf",
  "nps",
  "traditionalInsurance",
  "vehicle",
  "rentalDeposit",
  "others",
];

const LIABILITY_TOTAL_KEYS = [
  "houseLoan1",
  "houseLoan2",
  "loanAgainstShares",
  "personalLoan1",
  "personalLoan2",
  "creditCard1",
  "creditCard2",
  "vehicleLoan",
  "others",
];

const CASH_KEYS = ["bankBalance1", "bankBalance2"];
const LOAN_KEYS = [
  "houseLoan1",
  "houseLoan2",
  "loanAgainstShares",
  "personalLoan1",
  "personalLoan2",
  "vehicleLoan",
];
const CARD_KEYS = ["creditCard1", "creditCard2"];

const PROFESSION_LABELS = {
  salaried: "Salaried",
  selfEmployed: "Self-employed",
  businessOwner: "Business owner",
  student: "Student",
  retired: "Retired",
  other: "Other",
};

function sumFields(values, keys) {
  return keys.reduce((total, key) => total + parseINR(values?.[key]), 0);
}

function buildTrendSeries(baseValue, points = 40) {
  const base = Number.isFinite(baseValue) && baseValue > 0 ? baseValue : 1000000;
  const series = [];
  for (let i = 0; i < points; i += 1) {
    const phase = (i / (points - 1)) * Math.PI * 2;
    const variation = 0.02 * Math.sin(phase) + 0.012 * Math.cos(phase * 2);
    series.push(Math.max(0, Math.round(base * (1 + variation))));
  }
  return series;
}

function buildSparklinePath(values, width, height, padding = 2) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function ProfilePage() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8080";
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [planShared, setPlanShared] = useState(false);
  const [planGeneratedAt, setPlanGeneratedAt] = useState(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState([]);
  const [recentInvestments, setRecentInvestments] = useState([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const [investmentsError, setInvestmentsError] = useState("");

  const [riskLabel, setRiskLabel] = useState("");
  const [riskScore, setRiskScore] = useState(null);
  const [missingInfoNote, setMissingInfoNote] = useState("");
  const [zerodhaStatus, setZerodhaStatus] = useState({
    connected: false,
    updatedAt: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!authUser) {
      router.replace("/login");
    }
  }, [authReady, authUser, router]);

  useEffect(() => {
    const loadRecentInvestments = async (token) => {
      try {
        setInvestmentsLoading(true);
        setInvestmentsError("");
        const res = await fetch(`${API_BASE}/investments/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load investments");
        }
        const rows = Array.isArray(data)
          ? data
          : data?.items || data?.investments || [];
        setRecentInvestments(rows.slice(0, 3));
      } catch (err) {
        console.error("Failed to load recent investments", err);
        setInvestmentsError("Could not load recent investments.");
        setRecentInvestments([]);
      } finally {
        setInvestmentsLoading(false);
      }
    };

    const loadZerodhaStatus = async (token) => {
      try {
        const status = await fetchZerodhaStatus(API_BASE, token);
        setZerodhaStatus(status);
      } catch (err) {
        setZerodhaStatus({ connected: false, updatedAt: null });
      }
    };

    async function loadProfileAndPlan() {
      if (!authUser) return;
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const user = authUser;

        const idToken = await user.getIdToken();
        const token = idToken;

        const ref = doc(db, "clientProfiles", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          router.replace("/onboarding");
          return;
        }
        const data = snap.data();
        const rq = data.riskQuiz || {};
        if (rq.riskLabel) setRiskLabel(rq.riskLabel);
        if (rq.totalScore != null) setRiskScore(rq.totalScore);
        setProfile(data);

        await refreshPlanShared({ uid: user.uid, token, idToken });
        loadRecentInvestments(token);
        loadZerodhaStatus(token);

        setError("");
      } catch (e) {
        console.error("Failed to load profile", e);
        setError("Could not load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    const refreshPlanShared = async ({ uid, token, idToken } = {}) => {
      try {
        const currentUser = authUser;
        if (!currentUser || !uid) {
          setPlanShared(false);
          return;
        }

        const authToken = token || idToken || (await currentUser.getIdToken());
        const res = await fetch(`${API_BASE}/plans/shared/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          setPlanShared(false);
          return;
        }
        const data = await res.json();
        setPlanShared(!!data.shared);
        setPlanGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : null);
      } catch (err) {
        console.error("Failed to load plan share flag", err);
        setPlanShared(false);
        setPlanGeneratedAt(null);
      }
    };

    if (!authReady || !authUser) return;
    loadProfileAndPlan();
    const poll = setInterval(
      () => refreshPlanShared({ uid: authUser?.uid }),
      4000
    );

    return () => {
      clearInterval(poll);
    };
  }, [router, authReady, authUser, API_BASE]);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.notice === "plan-pending") {
      setNotice("Saved profile. Plan generation pending, please retry later.");
      router.replace("/profile", undefined, { shallow: true });
      const timer = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, router.query.notice]);

  const handleUpdateDetails = () => {
    setMissingInfoNote("Update your inputs below and resubmit.");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "";
    if (typeof ts === "string") return ts;
    if (typeof ts.toDate === "function") {
      return ts.toDate().toLocaleString();
    }
    return "";
  };

  const formatInvestmentDate = (value) => {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
    }
    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleDateString();
    }
    if (typeof value._seconds === "number") {
      return new Date(value._seconds * 1000).toLocaleDateString();
    }
    return "-";
  };

  const safeProfile = profile || {};
  const personal = safeProfile.personal || {};
  const assets = safeProfile.assets || {};
  const liabilities = safeProfile.liabilities || {};
  const cashFlow = safeProfile.cashFlow || {};
  const emergency = safeProfile.emergency || {};

  const firstName =
    (personal.name || "").trim().split(/\s+/)[0] ||
    (auth.currentUser?.email || "").split("@")[0];

  const initials = firstName ? firstName[0].toUpperCase() : "?";
  const displayName = personal.name || firstName || "User";

  const totalAssets =
    parseINR(assets.totalAsset) || sumFields(assets, ASSET_TOTAL_KEYS);
  const totalLiabilities =
    parseINR(liabilities.totalOutstanding) ||
    sumFields(liabilities, LIABILITY_TOTAL_KEYS);

  const bankTotal = sumFields(assets, CASH_KEYS);
  const emergencyTotal = parseINR(emergency.dedicatedAmount);
  const totalCash = bankTotal + emergencyTotal;

  const expensesMonthly =
    parseINR(cashFlow.totalMonthlyExpense) ||
    sumFields(cashFlow, CASH_FLOW_TOTAL_KEYS);
  const incomeMonthly =
    parseINR(personal.monthlyIncomeInHand) +
    parseINR(personal.passiveIncome) +
    parseINR(personal.otherIncome1) +
    parseINR(personal.otherIncome2) +
    Math.round(parseINR(personal.annualBonus) / 12);
  const surplus = incomeMonthly - expensesMonthly;

  const loanTotal = sumFields(liabilities, LOAN_KEYS);
  const cardTotal = sumFields(liabilities, CARD_KEYS);
  const otherLiabilities = parseINR(liabilities.others);

  const netWorth = totalCash + totalAssets - totalLiabilities;
  const historyRaw =
    safeProfile.netWorthHistory ||
    safeProfile.netWorthSeries ||
    safeProfile.netWorthTrend;
  const history = Array.isArray(historyRaw) ? historyRaw : [];

  const netWorthSeries = useMemo(() => {
    if (history.length > 1) {
      return history.map((value) => parseINR(value));
    }
    // TODO: Replace with real netWorthHistory from backend.
    return buildTrendSeries(netWorth);
  }, [history, netWorth]);

  const sparklinePath = buildSparklinePath(netWorthSeries, 120, 36);
  const netWorthChange =
    netWorthSeries.length > 1
      ? netWorthSeries[netWorthSeries.length - 1] - netWorthSeries[0]
      : 0;
  const netWorthChangePct =
    netWorthSeries.length > 1 && netWorthSeries[0]
      ? (netWorthChange / netWorthSeries[0]) * 100
      : 0;
  const netWorthChangeText = `${netWorthChange >= 0 ? "+" : "-"}${formatINR(
    Math.abs(netWorthChange)
  )}`;
  const netWorthChangePctText = `${netWorthChange >= 0 ? "+" : "-"}${Math.abs(
    netWorthChangePct
  ).toFixed(1)}%`;

  const savingsRate =
    incomeMonthly > 0 ? Math.round((surplus / incomeMonthly) * 100) : 0;
  const zerodhaConnected = zerodhaStatus?.connected === true;

  const authLoading = !authReady || (authReady && !authUser);

  if (authLoading || loading) {
    return (
      <div className={styles.fullPageCenter}>
        <div className={styles.loader}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleRow}>
          <h2>Profile</h2>
          {riskLabel && (
            <span
              className={`${styles.riskChip} ${
                styles["risk-" + riskLabel.toLowerCase()]
              }`}
            >
              {riskLabel} investor
              {riskScore != null && (
                <span className={styles.riskScore}> Score {riskScore}</span>
              )}
            </span>
          )}
        </div>
      </header>

      {notice && (
        <div className={styles.notice}>{notice}</div>
      )}

      {!!clarifyingQuestions.length && (
        <section className={styles.section}>
          <div className={styles.metricCard}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Missing info to finalize your plan
            </div>
            <ul style={{ margin: "8px 0 12px 18px", color: "#374151" }}>
              {clarifyingQuestions.map((item) => (
                <li key={item.id || item.question} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{item.question}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {item.whyItMatters}
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              Once you update and resubmit, your plan will regenerate and go for review.
            </div>
            {planGeneratedAt && (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                Last generated: {formatTimestamp(planGeneratedAt)}
              </div>
            )}
            {missingInfoNote && (
              <div style={{ fontSize: 12, color: "#9a3412", marginBottom: 8 }}>
                {missingInfoNote}
              </div>
            )}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleUpdateDetails}
            >
              Update details
            </button>
          </div>
        </section>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        <aside className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <div className={styles.name}>{displayName}</div>
              <div className={styles.metaText}>{auth.currentUser?.email || ""}</div>
            </div>
          </div>
          <div className={styles.metaBlock}>
            <div className={styles.metaRow}>
              <span>City</span>
              <span>{personal.city || "-"}</span>
            </div>
            <div className={styles.metaRow}>
              <span>Profession</span>
              <span>
                {PROFESSION_LABELS[personal.professionType] ||
                  personal.professionType ||
                  "-"}
              </span>
            </div>
            <div className={styles.connectionRow}>
              <span>Accounts</span>
              <span>
                Zerodha • {zerodhaConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className={styles.connectionHint}>BSE MFU • Coming soon</div>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push("/onboarding?mode=edit")}
          >
            Edit profile
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push("/my-plan")}
          >
            View my plan
          </button>
        </aside>

        <div className={styles.rightPane}>
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Net Worth</div>
              <div className={styles.kpiValue}>{formatINR(netWorth)}</div>
              <div className={styles.sparkline}>
                <svg
                  className={styles.sparklineSvg}
                  viewBox="0 0 120 36"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <title>
                    Net worth trend (last 90 days). Demo/illustration until live data is connected.
                  </title>
                  <path d={sparklinePath} className={styles.sparklinePath} />
                </svg>
              </div>
              <div className={styles.trendMeta}>
                90-day change: {netWorthChangeText} ({netWorthChangePctText})
              </div>
              <div className={styles.kpiBreakdown}>
                <div>Cash: {formatINR(totalCash)}</div>
                <div>Assets: {formatINR(totalAssets)}</div>
                <div>Liabilities: {formatINR(totalLiabilities)}</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total Cash</div>
              <div className={styles.kpiValue}>{formatINR(totalCash)}</div>
              <div className={styles.kpiBreakdown}>
                <div>Bank: {formatINR(bankTotal)}</div>
                <div>Emergency: {formatINR(emergencyTotal)}</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total Liabilities</div>
              <div className={styles.kpiValue}>{formatINR(totalLiabilities)}</div>
              <div className={styles.kpiBreakdown}>
                <div>Loans: {formatINR(loanTotal)}</div>
                <div>Cards: {formatINR(cardTotal)}</div>
                <div>Other: {formatINR(otherLiabilities)}</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Surplus Available</div>
              <div className={styles.kpiValue}>{formatINR(surplus)}</div>
              <div className={styles.kpiBreakdown}>
                <div>Income: {formatINR(incomeMonthly)}</div>
                <div>Expenses: {formatINR(expensesMonthly)}</div>
                <div>Savings rate: {Number.isFinite(savingsRate) ? savingsRate : 0}%</div>
              </div>
            </div>
          </section>

          <section className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <h3>Recent investments</h3>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push("/portfolio")}
              >
                View all
              </button>
            </div>
            {investmentsLoading ? (
              <div className={styles.emptyState}>Loading...</div>
            ) : investmentsError ? (
              <div className={styles.errorInline}>{investmentsError}</div>
            ) : recentInvestments.length === 0 ? (
              <div className={styles.emptyState}>
                <div>No recent investments yet.</div>
                <div>Tip: Connect Zerodha to see holdings.</div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => router.push("/portfolio")}
                >
                  Go to Portfolio
                </button>
              </div>
            ) : (
              <div className={styles.recentList}>
                {recentInvestments.map((inv) => {
                  const investmentId = inv.investmentId || inv.id;
                  const name = inv.bucketName || inv.bucketId || "Bucket";
                  const amount = formatINR(parseINR(inv.amount));
                  return (
                    <div
                      key={investmentId || `${name}-${inv.createdAt}`}
                      className={styles.recentRow}
                    >
                      <div>
                        <div className={styles.recentName}>{name}</div>
                      </div>
                      <div className={styles.recentAmount}>{amount || "-"}</div>
                      <div className={styles.recentDate}>
                        {formatInvestmentDate(inv.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
