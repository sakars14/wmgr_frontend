import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import styles from "../styles/ProfilePage.module.css";

const INFO_TABS = [
  { key: "overview", label: "Overview" },
  { key: "cashFlow", label: "Expenses" },
  { key: "assets", label: "Investments" },
  { key: "liabilities", label: "Liabilities" },
  { key: "insurance", label: "Insurance" },
  { key: "goals", label: "Goals" },
  { key: "risk", label: "Risk profile" },
];

// These field lists mirror your onboarding / Excel structure.
// If some key names differ, just tweak the key values.
const CASH_FLOW_FIELDS = [
  { key: "rent", label: "Rent" },
  { key: "maintainence", label: "Maintainence" },
  { key: "groceries", label: "Groceries" },
  { key: "utilities", label: "Utilities" },
  { key: "health", label: "Health" },
  { key: "gymPersonalCare", label: "Gym / Personal care" },
  { key: "dinningOut", label: "Dining Out" },
  { key: "fuel", label: "Fuel" },
  { key: "houseHelp", label: "House Help" },
  { key: "entertainment", label: "Entertainment" },
  { key: "parentsExpense", label: "Parents Expense" },
  { key: "miscExpense", label: "Misc Expense" },
  { key: "others", label: "Others" },
  { key: "annualLargeExpenses", label: "Annual Large Expenses (yearly)" },
  { key: "totalMonthlyExpense", label: "Total Monthly Expense (excluding EMIs)" },
];

const ASSET_FIELDS = [
  { key: "selfOccupiedHouse", label: "Self Occupied House" },
  { key: "house2", label: "House 2" },
  { key: "bankBalance1", label: "Bank Balance 1" },
  { key: "bankBalance2", label: "Bank Balance 2" },
  { key: "directEquity", label: "Direct Equity" },
  { key: "equityMf", label: "Equity MF" },
  { key: "debtMf", label: "Debt MF" },
  { key: "bonds", label: "Bonds" },
  { key: "goldSilver", label: "Gold / Silver" },
  { key: "esops", label: "ESOPs" },
  { key: "reit", label: "REIT" },
  { key: "realEstate", label: "Real Estate" },
  { key: "pms", label: "PMS" },
  { key: "aif", label: "AIF" },
  { key: "crypto", label: "Crypto" },
  { key: "startupInvestments", label: "Startup Investments" },
  { key: "fds", label: "FDs" },
  { key: "rds", label: "RDs" },
  { key: "postOfficeSchemes", label: "Post Office Schemes" },
  { key: "ppf", label: "PPF" },
  { key: "nps", label: "NPS" },
  { key: "traditionalInsurance", label: "Traditional Insurance" },
  { key: "vehicle", label: "Vehicle" },
  { key: "rentalDeposit", label: "Rental Deposit" },
  { key: "others", label: "Others" },
  { key: "totalAsset", label: "Total Asset" },
];

const CONTRIBUTION_FIELDS = [
  { key: "sipEquityMfMonthly", label: "Equity MF SIP (per month)" },
  { key: "sipDebtMfMonthly", label: "Debt MF SIP (per month)" },
  { key: "sipDirectEquityMonthly", label: "Direct Stocks SIP (per month)" },
  { key: "ppfMonthly", label: "PPF (per month)" },
  { key: "npsMonthly", label: "NPS (per month)" },
  { key: "epfMonthly", label: "EPF (per month)" },
  { key: "otherInvestMonthly", label: "Other Investments (per month)" },
];

const EMERGENCY_FIELDS = [
  { key: "monthsTarget", label: "Target Months of Expenses" },
  { key: "dedicatedAmount", label: "Dedicated Emergency Amount" },
];

const LIABILITY_FIELDS = [
  { key: "houseLoan1", label: "House Loan 1" },
  { key: "houseLoan2", label: "House Loan 2" },
  { key: "loanAgainstShares", label: "Loan Against Shares" },
  { key: "personalLoan1", label: "Personal Loan 1" },
  { key: "personalLoan2", label: "Personal Loan 2" },
  { key: "creditCard1", label: "Credit Card 1" },
  { key: "creditCard2", label: "Credit Card 2" },
  { key: "vehicleLoan", label: "Vehicle Loan" },
  { key: "others", label: "Others" },
  { key: "totalOutstanding", label: "Total Outstanding" },
];

const INSURANCE_FIELDS = [
  { key: "termPolicyClient", label: "Term Policy - Client" },
  { key: "officeHealthInsuranceClient", label: "Office Health - Client" },
  { key: "personalHealthBaseInsuranceClient", label: "Personal Health Base - Client" },
  { key: "superTopUpHealthInsuranceClient", label: "Super Top-up Health - Client" },
  { key: "termPolicySpouse", label: "Term Policy - Spouse" },
  { key: "officeHealthInsuranceSpouse", label: "Office Health - Spouse" },
  { key: "personalHealthBaseInsuranceSpouse", label: "Personal Health Base - Spouse" },
  { key: "superTopUpHealthInsuranceSpouse", label: "Super Top-up Health - Spouse" },
  { key: "otherPolicy", label: "Other Policy" },
];

const INSURANCE_PREMIUM_FIELDS = INSURANCE_FIELDS.map((field) => ({
  key: `${field.key}PremiumPerYear`,
  label: `${field.label} Premium per year`,
}));

const INSURANCE_FIELDS_EXTENDED = [
  ...INSURANCE_FIELDS,
  ...INSURANCE_PREMIUM_FIELDS,
];

const GOAL_FIELDS = [
  { key: "child1UnderGraduateEducation", label: "Child 1 UG Education" },
  { key: "child2UnderGraduateEducation", label: "Child 2 UG Education" },
  { key: "child1PostGraduateEducation", label: "Child 1 PG Education" },
  { key: "child2PostGraduateEducation", label: "Child 2 PG Education" },
  { key: "child1Marriage", label: "Child 1 Marriage" },
  { key: "child2Marriage", label: "Child 2 Marriage" },
  { key: "retirement", label: "Retirement" },
  { key: "house", label: "House" },
  { key: "startBusiness", label: "Start Business" },
  { key: "car", label: "Car" },
  { key: "gold", label: "Gold" },
  { key: "vacation", label: "Vacation" },
  { key: "others", label: "Others" },
  { key: "totalGoalValue", label: "Total Goal Value" },
];

const GOAL_FIELDS_EXTENDED = GOAL_FIELDS.flatMap((field) => {
  if (field.key === "totalGoalValue") {
    return [field];
  }
  return [
    field,
    { key: `${field.key}HorizonYears`, label: `${field.label} Horizon (years)` },
    { key: `${field.key}Priority`, label: `${field.label} Priority` },
  ];
});

const PROFESSION_LABELS = {
    salaried: "Salaried",
    selfEmployed: "Self-employed",
    businessOwner: "Business owner",
    student: "Student",
    retired: "Retired",
    other: "Other",
  };  

function SectionGrid({ title, fields, values }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.grid}>
        {fields.map((f) => (
          <div key={f.key} className={styles.fieldRow}>
            <div className={styles.label}>{f.label}</div>
            <div className={styles.value}>
              {values && values[f.key] ? values[f.key] : "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [planShared, setPlanShared] = useState(false);

  const [riskLabel, setRiskLabel] = useState("");
  const [riskScore, setRiskScore] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/");
      return;
    }

    async function loadProfileAndPlan() {
      try {
        const ref = doc(db, "clientProfiles", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          // If somehow profile missing, send back to onboarding
          router.replace("/onboarding");
          return;
        }
        const data = snap.data();
        const rq = data.riskQuiz || {};
        if (rq.riskLabel) setRiskLabel(rq.riskLabel);
        if (rq.totalScore != null) setRiskScore(rq.totalScore);
        setProfile(data);

        // Check share flag via backend (avoids Firestore client rules errors)
        await refreshPlanShared();
      } catch (e) {
        console.error("Failed to load profile", e);
        setError("Could not load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    async function refreshPlanShared() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const token = await currentUser.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/shared/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        setPlanShared(Boolean(data?.shared));
      } catch (err) {
        console.error("Failed to load plan share flag", err);
        setPlanShared(false);
      }
    }

    loadProfileAndPlan();
    const poll = setInterval(refreshPlanShared, 4000);

    return () => {
      clearInterval(poll);
    };
  }, [router]);

  if (loading) {
    return (
      <div className={styles.fullPageCenter}>
        <div className={styles.loader}>Loading profile…</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const personal = profile.personal || {};
  const firstName =
    (personal.name || "").trim().split(/\s+/)[0] ||
    (auth.currentUser?.email || "").split("@")[0];

  const initials = firstName ? firstName[0].toUpperCase() : "?";

  const overviewCards = [
    { label: "Total Assets", value: profile.assets?.totalAsset },
    { label: "Total Liabilities", value: profile.liabilities?.totalOutstanding },
    { label: "Monthly Expenses", value: profile.cashFlow?.totalMonthlyExpense },
    { label: "Total Goal Value", value: profile.goals?.totalGoalValue },
  ];

  const renderRightPane = () => {
    if (activeTab === "overview") {
      return (
        <>
          <section className={styles.headerRow}>
            <div className={styles.avatar}>
              <span>{initials}</span>
            </div>
            <div>
              <h1 className={styles.name}>{personal.name || firstName}</h1>
              <p className={styles.subline}>
                {personal.city || "City not set"}
              </p>
              <p className={styles.sublineSmall}>
                {auth.currentUser?.email}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push("/onboarding?mode=edit")}
              >
                Edit details
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Snapshot</h3>
            <div className={styles.cardsRow}>
              {overviewCards.map((c) => (
                <div key={c.label} className={styles.metricCard}>
                  <div className={styles.metricLabel}>{c.label}</div>
                  <div className={styles.metricValue}>
                    {c.value ? c.value : "—"}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
  <h3 className={styles.sectionTitle}>Personal details</h3>
  <div className={styles.grid}>
    <div className={styles.fieldRow}>
      <div className={styles.label}>Name</div>
      <div className={styles.value}>{personal.name || "—"}</div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Age</div>
      <div className={styles.value}>{personal.age || "—"}</div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Retirement age</div>
      <div className={styles.value}>{personal.retirementAge || "ƒ?"}</div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Dependents count</div>
      <div className={styles.value}>{personal.dependentsCount || "ƒ?"}</div>
    </div>


    <div className={styles.fieldRow}>
      <div className={styles.label}>City</div>
      <div className={styles.value}>{personal.city || "—"}</div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Profession</div>
      <div className={styles.value}>
        {PROFESSION_LABELS[personal.professionType] ||
          personal.professionType ||
          "—"}
      </div>
    </div>

    {personal.professionType === "other" && personal.professionOther && (
      <div className={styles.fieldRow}>
        <div className={styles.label}>Profession details</div>
        <div className={styles.value}>
          {personal.professionOther || "—"}
        </div>
      </div>
    )}

    <div className={styles.fieldRow}>
      <div className={styles.label}>Risk tolerance (self)</div>
      <div className={styles.value}>{personal.riskToleranceSelf || "ƒ?"}</div>
    </div>


    <div className={styles.fieldRow}>
      <div className={styles.label}>Tax regime</div>
      <div className={styles.value}>{personal.taxRegime || "—"}</div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Tax slab</div>
      <div className={styles.value}>{personal.taxSlab || "—"}</div>
    </div>
  </div>
</section>

<section className={styles.section}>
  <h3 className={styles.sectionTitle}>Income (annual)</h3>
  <div className={styles.grid}>
    <div className={styles.fieldRow}>
      <div className={styles.label}>Monthly income – in hand</div>
      <div className={styles.value}>
        {personal.monthlyIncomeInHand || "—"}
      </div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Annual bonus / incentive</div>
      <div className={styles.value}>
        {personal.annualBonus || "—"}
      </div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Passive income</div>
      <div className={styles.value}>
        {personal.passiveIncome || "—"}
      </div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Other income 1</div>
      <div className={styles.value}>
        {personal.otherIncome1 || "—"}
      </div>
    </div>

    <div className={styles.fieldRow}>
      <div className={styles.label}>Other income 2</div>
      <div className={styles.value}>
        {personal.otherIncome2 || "—"}
      </div>
    </div>
  </div>
</section>

<section className={styles.section}>
  <h3 className={styles.sectionTitle}>Emergency fund</h3>
  <div className={styles.grid}>
    {EMERGENCY_FIELDS.map((f) => (
      <div key={f.key} className={styles.fieldRow}>
        <div className={styles.label}>{f.label}</div>
        <div className={styles.value}>
          {profile.emergency && String(profile.emergency[f.key] ?? "") !== ""
            ? profile.emergency[f.key]
            : "ƒ?"}
        </div>
      </div>
    ))}
  </div>
</section>

<section className={styles.section}>
  <h3 className={styles.sectionTitle}>Monthly contributions</h3>
  <div className={styles.grid}>
    {CONTRIBUTION_FIELDS.map((f) => (
      <div key={f.key} className={styles.fieldRow}>
        <div className={styles.label}>{f.label}</div>
        <div className={styles.value}>
          {profile.contributions && String(profile.contributions[f.key] ?? "") !== ""
            ? profile.contributions[f.key]
            : "ƒ?"}
        </div>
      </div>
    ))}
  </div>
</section>


        </>
      );
    }

    if (activeTab === "cashFlow") {
      return (
        <SectionGrid
          title="Monthly expenses"
          fields={CASH_FLOW_FIELDS}
          values={profile.cashFlow || {}}
        />
      );
    }

    if (activeTab === "assets") {
      return (
        <SectionGrid
          title="Investments & assets"
          fields={ASSET_FIELDS}
          values={profile.assets || {}}
        />
      );
    }

    if (activeTab === "liabilities") {
      return (
        <SectionGrid
          title="Loans & liabilities"
          fields={LIABILITY_FIELDS}
          values={profile.liabilities || {}}
        />
      );
    }

    if (activeTab === "insurance") {
      return (
        <SectionGrid
          title="Insurance coverage"
          fields={INSURANCE_FIELDS_EXTENDED}
          values={profile.insurance || {}}
        />
      );
    }

    if (activeTab === "goals") {
      return (
        <SectionGrid
          title="Financial goals"
          fields={GOAL_FIELDS_EXTENDED}
          values={profile.goals || {}}
        />
      );
    }

    if (activeTab === "risk") {
        const rq = profile.riskQuiz || {};
        return (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Risk profile</h3>
            <p className={styles.sectionSubtitle}>
              Based on your questionnaire, you are classified as{" "}
              {rq.riskLabel || "—"} investor with a score of{" "}
              {rq.totalScore != null ? rq.totalScore : "—"}.
            </p>
          </section>
        );
    }

    return null;
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabel}>GENERAL</div>
          <nav className={styles.sidebarNav}>
            <button
              type="button"
              className={styles.sidebarItem}
              onClick={() => router.push("/buckets")}
            >
              Buckets
            </button>
            <button
              type="button"
              className={styles.sidebarItem}
              onClick={() => router.push("/admin")}
            >
              Admin
            </button>
          </nav>
        </div>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabel}>MY INFO</div>
          <nav className={styles.sidebarNav}>
            {INFO_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`${styles.sidebarItem} ${
                  activeTab === tab.key ? styles.sidebarItemActive : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabel}>MANAGE</div>
          <nav className={styles.sidebarNav}>
            <button
              type="button"
              className={styles.sidebarItem}
              onClick={() => router.push("/plans")}
            >
              Plans &amp; billing
            </button>
            {planShared && (
              <button
                type="button"
                className={styles.sidebarItem}
                onClick={() => router.push("/my-plan")}
              >
                View my plan
              </button>
            )}

            <button
              type="button"
              className={styles.sidebarItem}
              onClick={() => router.push("/support")}
            >
              Support
            </button>
          </nav>
        </div>
      </aside>

      <main className={styles.mainPane}>
        <header className={styles.mainHeader}>
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
                  <span className={styles.riskScore}>
                    {" "}
                    · Score {riskScore}
                  </span>
                )}
              </span>
            )}
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {renderRightPane()}
      </main>
    </div>
  );
}
