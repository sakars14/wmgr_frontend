// pages/onboarding.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Onboarding.module.css";
import { auth, db } from "../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { RISK_QUESTIONS } from "../lib/riskQuestions";

// --- Meta config ----------------------------------------------------

const STEPS = [
  { key: "personal",    label: "Personal details" },
  { key: "cashFlow",    label: "Cash flow" },
  { key: "assets",      label: "Assets" },
  { key: "liabilities", label: "Liabilities" },
  { key: "emergency",   label: "Emergency" },
  { key: "insurance",   label: "Insurance" },
  { key: "goals",       label: "Goals" },
  { key: "risk",        label: "Risk assessment" }, // NEW
];

const STEP_INDEX_BY_KEY = STEPS.reduce((acc, step, index) => {
  acc[step.key] = index;
  return acc;
}, {});

const stepIndex = (key) => STEP_INDEX_BY_KEY[key] ?? 0;


const PROFESSION_OPTIONS = [
  { value: "salaried", label: "Salaried" },
  { value: "selfEmployed", label: "Self-employed" },
  { value: "businessOwner", label: "Business owner" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

const TAX_REGIME_OPTIONS = [
  { value: "old", label: "Old regime" },
  { value: "new", label: "New regime" },
];

const RISK_TOLERANCE_OPTIONS = [
  { value: "", label: "Select your risk tolerance" },
  { value: "Low", label: "Low" },
  { value: "Moderate", label: "Moderate" },
  { value: "High", label: "High" },
];

const RETIREMENT_AGE_OPTIONS = [
  { value: "", label: "Select retirement age" },
  ...Array.from({ length: 21 }, (_, idx) => {
    const value = String(50 + idx);
    return { value, label: value };
  }),
];

const EMERGENCY_MONTH_OPTIONS = [
  { value: "", label: "Select months" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
];

// You can tweak these slabs to match the latest rules
const TAX_SLABS_BY_REGIME = {
  old: [
    "Up to ₹2.5L",
    "₹2.5L – ₹5L",
    "₹5L – ₹10L",
    "₹10L – ₹15L",
    "Above ₹15L",
  ],
  new: [
    "Up to ₹3L",
    "₹3L – ₹7L",
    "₹7L – ₹10L",
    "₹10L – ₹15L",
    "Above ₹15L",
  ],
};

// --- Field configs derived from your Excel --------------------------

const CASH_FLOW_FIELDS = [
  { key: "rent", label: "Rent" },
  { key: "maintainence", label: "Maintainence" },
  { key: "groceries", label: "Groceries" },
  { key: "utilities", label: "Utilities" },
  { key: "health", label: "Health" },
  { key: "gymPersonalCare", label: "Gym /Personal care" },
  { key: "dinningOut", label: "Dinning Out" },
  { key: "fuel", label: "Fuel" },
  { key: "houseHelp", label: "House help" },
  { key: "entertainment", label: "Entertainment" },
  { key: "parentsExpense", label: "Parents expense" },
  { key: "miscExpense", label: "Misc expense" },
  { key: "others", label: "Others" },
  { key: "annualLargeExpenses", label: "Annual Large Expenses (yearly)" },
  { key: "totalMonthlyExpense", label: "Total Monthly Expense (excluding EMIs)" },
];

const ASSET_FIELDS = [
  { key: "selfOccupiedHouse", label: "Self Occupied House" },
  { key: "house2", label: "House 2" },
  { key: "bankBalance1", label: "Bank Balance1" },
  { key: "bankBalance2", label: "Bank Balance2" },
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
  { key: "startupInvestments", label: "Startup investments" },
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

const LIABILITY_FIELDS = [
  { key: "houseLoan1", label: "House Loan1" },
  { key: "houseLoan2", label: "House Loan2" },
  { key: "loanAgainstShares", label: "Loan Against Shares" },
  { key: "personalLoan1", label: "Personal Loan1" },
  { key: "personalLoan2", label: "Personal Loan2" },
  { key: "creditCard1", label: "Credit Card1" },
  { key: "creditCard2", label: "Credit Card2" },
  { key: "vehicleLoan", label: "Vehicle Loan" },
  { key: "others", label: "Others" },
  { key: "totalOutstanding", label: "Total Outstanding" },
];

const LIABILITY_LOAN_FIELDS = [
  {
    amountKey: "houseLoan1",
    label: "House Loan 1",
    emiKey: "houseLoan1Emi",
    remainingMonthsKey: "houseLoan1RemainingMonths",
  },
  {
    amountKey: "houseLoan2",
    label: "House Loan 2",
    emiKey: "houseLoan2Emi",
    remainingMonthsKey: "houseLoan2RemainingMonths",
  },
  {
    amountKey: "loanAgainstShares",
    label: "Loan Against Shares",
    emiKey: "loanAgainstSharesEmi",
    remainingMonthsKey: "loanAgainstSharesRemainingMonths",
  },
  {
    amountKey: "personalLoan1",
    label: "Personal Loan 1",
    emiKey: "personalLoan1Emi",
    remainingMonthsKey: "personalLoan1RemainingMonths",
  },
  {
    amountKey: "personalLoan2",
    label: "Personal Loan 2",
    emiKey: "personalLoan2Emi",
    remainingMonthsKey: "personalLoan2RemainingMonths",
  },
  {
    amountKey: "creditCard1",
    label: "Credit Card 1",
    emiKey: "creditCard1Emi",
    remainingMonthsKey: "creditCard1RemainingMonths",
    remainingOptional: true,
  },
  {
    amountKey: "creditCard2",
    label: "Credit Card 2",
    emiKey: "creditCard2Emi",
    remainingMonthsKey: "creditCard2RemainingMonths",
    remainingOptional: true,
  },
  {
    amountKey: "vehicleLoan",
    label: "Vehicle Loan",
    emiKey: "vehicleLoanEmi",
    remainingMonthsKey: "vehicleLoanRemainingMonths",
  },
  {
    amountKey: "others",
    label: "Other Loan",
    emiKey: "othersEmi",
    remainingMonthsKey: "othersRemainingMonths",
  },
];

const REMAINING_MONTH_OPTIONS = [
  { value: "", label: "Select months" },
  ...Array.from({ length: 360 }, (_, idx) => {
    const value = String(idx + 1);
    return {
      value,
      label: `${value} month${idx + 1 === 1 ? "" : "s"}`,
    };
  }),
];

const LIABILITY_EMI_FIELDS = LIABILITY_LOAN_FIELDS.map((loan) => ({
  key: loan.emiKey,
}));
const LIABILITY_REMAINING_FIELDS = LIABILITY_LOAN_FIELDS.map((loan) => ({
  key: loan.remainingMonthsKey,
}));

const LEGACY_CASHFLOW_EMI_MAP = [
  { cashFlowKey: "homeEmi1", liabilityKey: "houseLoan1Emi" },
  { cashFlowKey: "homeEmi2", liabilityKey: "houseLoan2Emi" },
  { cashFlowKey: "personalLoanEmi", liabilityKey: "personalLoan1Emi" },
  { cashFlowKey: "creditCardEmi", liabilityKey: "creditCard1Emi" },
  { cashFlowKey: "vehicleLoanEmi", liabilityKey: "vehicleLoanEmi" },
  { cashFlowKey: "otherEmi", liabilityKey: "othersEmi" },
];

const LIABILITY_FIELDS_ALL = [
  ...LIABILITY_FIELDS,
  ...LIABILITY_EMI_FIELDS,
  ...LIABILITY_REMAINING_FIELDS,
];


const INSURANCE_FIELDS = [
  { key: "termPolicyClient", label: "Term Policy - Client" },
  {
    key: "officeHealthInsuranceClient",
    label: "Office Health Insurance - Client",
  },
  {
    key: "personalHealthBaseInsuranceClient",
    label: "Personal Health Base Insurance - Client",
  },
  {
    key: "superTopUpHealthInsuranceClient",
    label: "Super Top-up Health Insurance - Client",
  },
  { key: "termPolicySpouse", label: "Term Policy - Spouse" },
  {
    key: "officeHealthInsuranceSpouse",
    label: "Office Health Insurance - Spouse",
  },
  {
    key: "personalHealthBaseInsuranceSpouse",
    label: "Personal Health Base Insurance - Spouse",
  },
  {
    key: "superTopUpHealthInsuranceSpouse",
    label: "Super Top-up Health Insurance - Spouse",
  },
  { key: "otherPolicy", label: "Other Policy" },
];

const INSURANCE_ENTRIES = INSURANCE_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
  premiumKey: `${field.key}PremiumPerYear`,
}));

const INSURANCE_PREMIUM_FIELDS = INSURANCE_ENTRIES.map((entry) => ({
  key: entry.premiumKey,
}));

const GOAL_FIELDS = [
  {
    key: "child1UnderGraduateEducation",
    label: "Child 1 Under Graduate Education",
  },
  {
    key: "child2UnderGraduateEducation",
    label: "Child 2 Under Graduate Education",
  },
  {
    key: "child1PostGraduateEducation",
    label: "Child 1 Post Graduate Education",
  },
  {
    key: "child2PostGraduateEducation",
    label: "Child 2 Post Graduate Education",
  },
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

const GOAL_ENTRIES = GOAL_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
  horizonKey: `${field.key}HorizonYears`,
  priorityKey: `${field.key}Priority`,
}));

const GOAL_META_FIELDS = GOAL_ENTRIES.flatMap((entry) => {
  if (entry.key === "totalGoalValue") return [];
  return [{ key: entry.horizonKey }, { key: entry.priorityKey }];
});

const INSURANCE_FIELDS_ALL = [
  ...INSURANCE_FIELDS,
  ...INSURANCE_PREMIUM_FIELDS,
];

const GOAL_FIELDS_ALL = [
  ...GOAL_FIELDS,
  ...GOAL_META_FIELDS,
];

const GOAL_HORIZON_OPTIONS = [
  { value: "", label: "Select years" },
  ...Array.from({ length: 40 }, (_, idx) => {
    const value = String(idx + 1);
    return {
      value,
      label: `${value} year${idx + 1 === 1 ? "" : "s"}`,
    };
  }),
];

const GOAL_PRIORITY_OPTIONS = [
  { value: "", label: "Select priority" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

// helper to init numeric sections
function makeEmptyFromFields(fields) {
  const obj = {};
  fields.forEach((f) => {
    obj[f.key] = "";
  });
  return obj;
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function buildSectionFromFields(fields, source) {
  const base = makeEmptyFromFields(fields);
  if (!source) return base;
  fields.forEach((f) => {
    if (source[f.key] !== undefined) {
      base[f.key] = source[f.key];
    }
  });
  return base;
}

// --- Small reusable components -------------------------------------

function OptionCard({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.optionCard} ${
        selected ? styles.optionCardSelected : ""
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

function NumberFieldGrid({ fields, values, onChange }) {
  return (
    <div className={styles.grid}>
      {fields.map((f) => (
        <div key={f.key} className={styles.fieldRow}>
          <label className={styles.label}>{f.label}</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

// --- Main component -------------------------------------------------

export default function Onboarding() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true); // checking auth + profile
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [personal, setPersonal] = useState({
    name: "",
    age: "",
    retirementAge: "",
    dependentsCount: "",
    riskToleranceSelf: "",
    city: "",
    professionType: "",
    professionOther: "",
    monthlyIncomeInHand: "",
    annualBonus: "",
    passiveIncome: "",
    otherIncome1: "",
    otherIncome2: "",
    taxRegime: "",
    taxSlab: "",
  });

  const [cashFlow, setCashFlow] = useState(() =>
    makeEmptyFromFields(CASH_FLOW_FIELDS)
  );
  const [assets, setAssets] = useState(() =>
    makeEmptyFromFields(ASSET_FIELDS)
  );
  const [liabilities, setLiabilities] = useState(() =>
    makeEmptyFromFields(LIABILITY_FIELDS_ALL)
  );
  const [emergency, setEmergency] = useState({
    monthsTarget: "",
    dedicatedAmount: "",
  });
  const [contributions, setContributions] = useState(() =>
    makeEmptyFromFields(CONTRIBUTION_FIELDS)
  );
  const [insurance, setInsurance] = useState(() =>
    makeEmptyFromFields(INSURANCE_FIELDS_ALL)
  );
  const [goals, setGoals] = useState(() =>
    makeEmptyFromFields(GOAL_FIELDS_ALL)
  );
  const [isExistingProfile, setIsExistingProfile] = useState(false);

  const [riskAnswers, setRiskAnswers] = useState({});
  const [riskError, setRiskError] = useState("");
  const handleRiskChange = (qName, value) => {
    setRiskAnswers(prev => ({ ...prev, [qName]: value }));
  };

  // only allow signed-in users; skip if profile already exists
  useEffect(() => {
    if (!router.isReady) return;
  
    async function init() {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/");
        return;
      }
  
      const editMode = router.query.mode === "edit";
  
      try {
        const profileRef = doc(db, "clientProfiles", user.uid);

        const snapshot = await getDoc(profileRef);
  
        if (editMode) {
          // Editing an existing profile (or starting edit if none yet)
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            setIsExistingProfile(true);
  
            const personalData = data.personal || {};
            const cashFlowData = data.cashFlow || {};
            const assetsData = data.assets || {};
            const liabilitiesData = data.liabilities || {};
            const insuranceData = data.insurance || {};
            const goalsData = data.goals || {};
            const emergencyData = data.emergency || {};
            const contributionsData = data.contributions || {};

            setPersonal((prev) => ({
              ...prev,
              ...personalData,
            }));
            setCashFlow(buildSectionFromFields(CASH_FLOW_FIELDS, cashFlowData));
            setAssets(buildSectionFromFields(ASSET_FIELDS, assetsData));

            const baseLiabilities = {
              ...makeEmptyFromFields(LIABILITY_FIELDS_ALL),
              ...liabilitiesData,
            };
            const migratedEmi = {};
            LEGACY_CASHFLOW_EMI_MAP.forEach((mapping) => {
              if (
                isBlank(baseLiabilities[mapping.liabilityKey]) &&
                !isBlank(cashFlowData[mapping.cashFlowKey])
              ) {
                migratedEmi[mapping.liabilityKey] = cashFlowData[mapping.cashFlowKey];
              }
            });
            setLiabilities({
              ...baseLiabilities,
              ...migratedEmi,
            });

            setInsurance(buildSectionFromFields(INSURANCE_FIELDS_ALL, insuranceData));
            setGoals(buildSectionFromFields(GOAL_FIELDS_ALL, goalsData));
            setEmergency((prev) => ({
              ...prev,
              ...emergencyData,
            }));
            setContributions(buildSectionFromFields(CONTRIBUTION_FIELDS, contributionsData));
                        // Restore saved risk answers (if any) into the radio state
                        if (data.riskQuiz && data.riskQuiz.answers) {
                          const ans = data.riskQuiz.answers;
                          const restored = {};
            
                          RISK_QUESTIONS.forEach((q, idx) => {
                            const indexKey = String(idx + 1);
                            const optIndex =
                              ans[indexKey] !== undefined ? ans[indexKey] : ans[idx + 1];
            
                            if (optIndex != null && optIndex > 0) {
                              const opt = q.options[optIndex - 1];
                              if (opt) {
                                const [, val] = opt;       // [label, value]
                                restored[q.name] = String(val);
                              }
                            }
                          });
            
                          setRiskAnswers(restored);
                        }
            
          } else {
            // No existing doc: treat like fresh, still allow editing
            setIsExistingProfile(false);
          }
  
          setLoading(false);
        } else {
          // Normal first-time onboarding mode
          if (snapshot.exists()) {
            // already onboarded → go to buckets
            router.replace("/buckets");
          } else {
            setIsExistingProfile(false);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error checking profile", err);
        setError("Could not load your profile. Please try again.");
        setLoading(false);
      }
    }
  
    init();
  }, [router]);  

  const goNext = () => {
    setError("");
    setCurrentStep((prev) =>
      prev < STEPS.length - 1 ? prev + 1 : prev
    );
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    setError("");
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToStep = (index) => {
    setError("");
    setCurrentStep(index);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  const updatePersonal = (key, value) => {
    setPersonal((prev) => ({ ...prev, [key]: value }));
  };

  const updateCashFlow = (key, value) => {
    setCashFlow((prev) => ({ ...prev, [key]: value }));
  };

  const updateAssets = (key, value) => {
    setAssets((prev) => ({ ...prev, [key]: value }));
  };

  const updateLiabilities = (key, value) => {
    setLiabilities((prev) => ({ ...prev, [key]: value }));
  };

  const updateEmergency = (key, value) => {
    setEmergency((prev) => ({ ...prev, [key]: value }));
  };

  const updateContributions = (key, value) => {
    setContributions((prev) => ({ ...prev, [key]: value }));
  };

  const updateInsurance = (key, value) => {
    setInsurance((prev) => ({ ...prev, [key]: value }));
  };

  const updateGoals = (key, value) => {
    setGoals((prev) => ({ ...prev, [key]: value }));
  };

  const computeRiskQuizResult = () => {
    let total = 0;
    const answers = {}; // e.g. { "1": 1, "2": 3, ... }

    RISK_QUESTIONS.forEach((q, idx) => {
      const selectedVal = riskAnswers[q.name];
      const val = Number(selectedVal || 0); // unanswered = 0
      total += val;

      // Figure out which option number (1, 2, 3, ...) was chosen
      let optionIndex = null;
      if (selectedVal != null) {
        const foundIndex = q.options.findIndex(
          ([label, value]) => String(value) === String(selectedVal)
        );
        if (foundIndex !== -1) {
          optionIndex = foundIndex + 1; // make it 1-based
        }
      }

      // Use "1", "2", ... as keys
      answers[idx + 1] = optionIndex;
    });

    let riskLabel;
    if (total <= 10)       riskLabel = "Conservative";
    else if (total <= 20)  riskLabel = "Balanced";
    else if (total <= 60)  riskLabel = "Aggressive";
    else                   riskLabel = "Outlier";

    return { totalScore: total, riskLabel, answers };
  };

  const validateRiskQuiz = () => {
    const unanswered = RISK_QUESTIONS.filter(q => !riskAnswers[q.name]);
    if (unanswered.length > 0) {
      setRiskError("Please answer all risk questions before finishing.");
      return false;
    }
    setRiskError("");
    return true;
  };
  
  const REQUIRED_PERSONAL_KEYS = [
    "name",
    "age",
    "retirementAge",
    "dependentsCount",
    "riskToleranceSelf",
    "city",
    "professionType",
    "monthlyIncomeInHand",
    "taxRegime",
    "taxSlab",
  ];

  const REQUIRED_CASHFLOW_KEYS = ["totalMonthlyExpense"];
  const REQUIRED_EMERGENCY_KEYS = ["monthsTarget"];
  const REQUIRED_GOALS_KEYS = ["totalGoalValue"];

  const validateMandatoryFields = () => {
    // Personal
    for (const k of REQUIRED_PERSONAL_KEYS) {
      if (isBlank(personal[k])) {
        setError(`Please fill required field: ${k} (Personal details)`);
        setCurrentStep(stepIndex("personal"));
        return false;
      }
    }

    if (personal.professionType === "other" && isBlank(personal.professionOther)) {
      setError("Please fill required field: professionOther (Personal details)");
      setCurrentStep(stepIndex("personal"));
      return false;
    }

    // Cashflow
    for (const k of REQUIRED_CASHFLOW_KEYS) {
      if (isBlank(cashFlow[k])) {
        setError(`Please fill required field: ${k} (Cash flow)`);
        setCurrentStep(stepIndex("cashFlow"));
        return false;
      }
    }

    const requireLoanFields = (loan) => {
      const amt = parseFloat(liabilities[loan.amountKey] || "0");
      if (amt > 0 && isBlank(liabilities[loan.emiKey])) {
        setError(`Please fill EMI for ${loan.label} (Liabilities tab).`);
        setCurrentStep(stepIndex("liabilities"));
        return false;
      }
      if (
        amt > 0 &&
        !loan.remainingOptional &&
        isBlank(liabilities[loan.remainingMonthsKey])
      ) {
        setError(`Please select remaining months for ${loan.label} (Liabilities tab).`);
        setCurrentStep(stepIndex("liabilities"));
        return false;
      }
      return true;
    };

    for (const loan of LIABILITY_LOAN_FIELDS) {
      if (!requireLoanFields(loan)) return false;
    }

    // Emergency
    for (const k of REQUIRED_EMERGENCY_KEYS) {
      if (isBlank(emergency[k])) {
        setError(`Please fill required field: ${k} (Emergency)`);
        setCurrentStep(stepIndex("emergency"));
        return false;
      }
    }

    // Goals: require total + at least one goal amount > 0
    for (const k of REQUIRED_GOALS_KEYS) {
      if (isBlank(goals[k])) {
        setError(`Please fill required field: ${k} (Goals)`);
        setCurrentStep(stepIndex("goals"));
        return false;
      }
    }

    const goalKeys = GOAL_FIELDS.map((f) => f.key).filter((k) => k !== "totalGoalValue");
    const anyGoal = goalKeys.some((k) => parseFloat(goals[k] || "0") > 0);
    if (!anyGoal) {
      setError("Please enter at least one goal amount (Goals tab).");
      setCurrentStep(stepIndex("goals"));
      return false;
    }

    for (const entry of GOAL_ENTRIES) {
      if (entry.key === "totalGoalValue") continue;
      const amount = parseFloat(goals[entry.key] || "0");
      if (amount > 0 && isBlank(goals[entry.horizonKey])) {
        setError(`Please select horizon (years) for ${entry.label} (Goals tab).`);
        setCurrentStep(stepIndex("goals"));
        return false;
      }
      if (amount > 0 && isBlank(goals[entry.priorityKey])) {
        setError(`Please select priority for ${entry.label} (Goals tab).`);
        setCurrentStep(stepIndex("goals"));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError("");

    const mandatoryOk = validateMandatoryFields();
    if (!mandatoryOk) return;
    
    const editMode = router.query.mode === "edit";

    // Still enforce "all questions answered" only on first-time onboarding.
    if (!editMode) {
      const ok = validateRiskQuiz();
      if (!ok) {
        return; // do not attempt save
      }
    }

    setSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You’ve been logged out. Please sign in again.");
        setSaving(false);
        return;
      }

      const profileRef = doc(db, "clientProfiles", user.uid);

      const normalizedCashFlow = buildSectionFromFields(CASH_FLOW_FIELDS, cashFlow);
      if (isBlank(normalizedCashFlow.annualLargeExpenses)) {
        normalizedCashFlow.annualLargeExpenses = 0;
      }

      const normalizedAssets = buildSectionFromFields(ASSET_FIELDS, assets);
      const normalizedLiabilities = buildSectionFromFields(LIABILITY_FIELDS_ALL, liabilities);
      const normalizedInsurance = buildSectionFromFields(INSURANCE_FIELDS_ALL, insurance);
      const normalizedGoals = buildSectionFromFields(GOAL_FIELDS_ALL, goals);
      const normalizedEmergency = {
        monthsTarget: emergency.monthsTarget ?? "",
        dedicatedAmount: emergency.dedicatedAmount ?? "",
      };

      const normalizedContributions = {};
      CONTRIBUTION_FIELDS.forEach((field) => {
        const raw = contributions[field.key];
        if (isBlank(raw)) {
          normalizedContributions[field.key] = 0;
        } else {
          const num = parseFloat(raw);
          normalizedContributions[field.key] = Number.isNaN(num) ? 0 : num;
        }
      });


      const payload = {
        personal,
        cashFlow: normalizedCashFlow,
        assets: normalizedAssets,
        liabilities: normalizedLiabilities,
        emergency: normalizedEmergency,
        contributions: normalizedContributions,
        insurance: normalizedInsurance,
        goals: normalizedGoals,
        schemaVersion: "phase0-v2",
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      };

      // ✅ ALWAYS compute & save riskQuiz, even in edit mode
      const riskQuiz = computeRiskQuizResult();
      payload.riskQuiz = riskQuiz;

      // Only set createdAt the first time we create the profile
      if (!isExistingProfile) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(profileRef, payload, { merge: true });

      let generationOk = true;
      try {
        const token = await user.getIdToken();
        const source = editMode ? "profile-resubmit" : "onboarding-submit";
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/generate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source }),
        });
        if (!res.ok) {
          generationOk = false;
        }
      } catch (err) {
        console.error("Plan generation failed", err);
        generationOk = false;
      }

      const notice = generationOk ? "" : "?notice=plan-pending";
      router.replace(`/profile${notice}`);
    } catch (err) {
      console.error("Error saving profile", err);
      setError("Something went wrong while saving. Please try again.");
      setSaving(false);
    }
  }; 

  const taxSlabOptions =
    personal.taxRegime && TAX_SLABS_BY_REGIME[personal.taxRegime]
      ? TAX_SLABS_BY_REGIME[personal.taxRegime]
      : [];

  const isLastStep = currentStep === STEPS.length - 1;

  // --- Per-step renderers -------------------------------------------

  const renderPersonalStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>
        Tell us about yourself
      </h2>
      <p className={styles.sectionSubtitle}>
        We’ll only ask these questions once. They help us personalise
        your plan.
      </p>

      <div className={styles.fieldRow}>
        <label className={styles.label}>Full name</label>
        <input
          type="text"
          className={styles.input}
          value={personal.name}
          onChange={(e) => updatePersonal("name", e.target.value)}
          placeholder="e.g. Sakar Srivastava"
        />
      </div>

      <div className={styles.inlineRow}>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Age</label>
          <input
            type="number"
            min="18"
            className={styles.input}
            value={personal.age}
            onChange={(e) => updatePersonal("age", e.target.value)}
            placeholder="32"
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>City</label>
          <input
            type="text"
            className={styles.input}
            value={personal.city}
            onChange={(e) => updatePersonal("city", e.target.value)}
            placeholder="Bengaluru"
          />
        </div>
      </div>

      <div className={styles.inlineRow}>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Retirement age</label>
          <select
            className={styles.select}
            value={personal.retirementAge}
            onChange={(e) => updatePersonal("retirementAge", e.target.value)}
          >
            {RETIREMENT_AGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Dependents count</label>
          <input
            type="number"
            min="0"
            className={styles.input}
            value={personal.dependentsCount}
            onChange={(e) => updatePersonal("dependentsCount", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.label}>Self-assessed risk tolerance</label>
        <select
          className={styles.select}
          value={personal.riskToleranceSelf}
          onChange={(e) => updatePersonal("riskToleranceSelf", e.target.value)}
        >
          {RISK_TOLERANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Profession</label>
          <span className={styles.hint}>
            Choose the option closest to you
          </span>
        </div>
        <div className={styles.optionGrid}>
          {PROFESSION_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={personal.professionType === option.value}
              onClick={() =>
                updatePersonal("professionType", option.value)
              }
            />
          ))}
        </div>

        {personal.professionType === "other" && (
          <div className={styles.fieldRow}>
            <label className={styles.label}>Profession details</label>
            <input
              type="text"
              className={styles.input}
              value={personal.professionOther}
              onChange={(e) =>
                updatePersonal("professionOther", e.target.value)
              }
              placeholder="Describe your work"
            />
          </div>
        )}
      </div>

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitleSmall}>Income (annual)</h3>

      <div className={styles.grid}>
        <div className={styles.fieldRow}>
          <label className={styles.label}>
            Monthly income – in hand
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={personal.monthlyIncomeInHand}
            onChange={(e) =>
              updatePersonal("monthlyIncomeInHand", e.target.value)
            }
            placeholder="e.g. 150000"
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>
            Annual bonus / incentive
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={personal.annualBonus}
            onChange={(e) =>
              updatePersonal("annualBonus", e.target.value)
            }
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Passive income</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={personal.passiveIncome}
            onChange={(e) =>
              updatePersonal("passiveIncome", e.target.value)
            }
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Other income 1</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={personal.otherIncome1}
            onChange={(e) =>
              updatePersonal("otherIncome1", e.target.value)
            }
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Other income 2</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={personal.otherIncome2}
            onChange={(e) =>
              updatePersonal("otherIncome2", e.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitleSmall}>Tax details</h3>

      <div className={styles.fieldRow}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Tax regime</label>
          <span className={styles.hint}>
            You can always change this later
          </span>
        </div>
        <div className={styles.optionGrid}>
          {TAX_REGIME_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={personal.taxRegime === option.value}
              onClick={() => {
                updatePersonal("taxRegime", option.value);
                // reset chosen slab when regime changes
                updatePersonal("taxSlab", "");
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.label}>Tax slab (approximate)</label>
        <select
          className={styles.select}
          disabled={!taxSlabOptions.length}
          value={personal.taxSlab}
          onChange={(e) =>
            updatePersonal("taxSlab", e.target.value)
          }
        >
          <option value="">Select your slab</option>
          {taxSlabOptions.map((slab) => (
            <option key={slab} value={slab}>
              {slab}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderCashFlowStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Monthly cash flow</h2>
      <p className={styles.sectionSubtitle}>
        Rough numbers are okay. We just need a sense of where money
        goes every month (excluding EMIs).
      </p>
      <p className={styles.sectionSubtitle}>
        EMIs are captured in Liabilities.
      </p>

      <NumberFieldGrid
        fields={CASH_FLOW_FIELDS}
        values={cashFlow}
        onChange={updateCashFlow}
      />
    </div>
  );

  const renderAssetsStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Assets</h2>
      <p className={styles.sectionSubtitle}>
        Approximate current values in rupees. Leave blank if not
        applicable.
      </p>

      <NumberFieldGrid
        fields={ASSET_FIELDS}
        values={assets}
        onChange={updateAssets}
      />

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitleSmall}>Monthly Contributions (Optional)</h3>
      <p className={styles.sectionSubtitle}>
        Add any ongoing monthly investments or retirement contributions.
      </p>

      <NumberFieldGrid
        fields={CONTRIBUTION_FIELDS}
        values={contributions}
        onChange={updateContributions}
      />
    </div>
  );

  const renderLiabilitiesStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Liabilities</h2>
      <p className={styles.sectionSubtitle}>
        Outstanding loan amounts and other dues.
      </p>
  
      <NumberFieldGrid
        fields={LIABILITY_FIELDS}
        values={liabilities}
        onChange={updateLiabilities}
      />
  
      <div className={styles.sectionDivider} />
  
      <h3 className={styles.sectionTitleSmall}>EMI and remaining tenure</h3>
      <p className={styles.sectionSubtitle}>
        Add EMI and remaining months only for loans with outstanding amounts.
      </p>

      {LIABILITY_LOAN_FIELDS.some(
        (loan) => parseFloat(liabilities[loan.amountKey] || "0") > 0
      ) ? (
        <div className={styles.grid}>
          {LIABILITY_LOAN_FIELDS.flatMap((loan) => {
            const amt = parseFloat(liabilities[loan.amountKey] || "0");
            if (amt <= 0) return [];
            return [
              (
                <div key={`${loan.amountKey}-emi`} className={styles.fieldRow}>
                  <label className={styles.label}>{loan.label} EMI</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    className={styles.input}
                    value={liabilities[loan.emiKey] ?? ""}
                    onChange={(e) => updateLiabilities(loan.emiKey, e.target.value)}
                  />
                </div>
              ),
              (
                <div key={`${loan.amountKey}-remaining`} className={styles.fieldRow}>
                  <label className={styles.label}>
                    {loan.label} remaining months{loan.remainingOptional ? " (optional)" : ""}
                  </label>
                  <select
                    className={styles.select}
                    value={liabilities[loan.remainingMonthsKey] ?? ""}
                    onChange={(e) =>
                      updateLiabilities(loan.remainingMonthsKey, e.target.value)
                    }
                  >
                    {REMAINING_MONTH_OPTIONS.map((opt) => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ),
            ];
          })}
        </div>
      ) : (
        <p className={styles.sectionSubtitle}>
          Enter outstanding amounts above to add EMI details.
        </p>
      )}
    </div>
  );  

  const renderEmergencyStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Emergency fund</h2>
      <p className={styles.sectionSubtitle}>
        Tell us about your emergency buffer target and what is already set aside.
      </p>

      <div className={styles.grid}>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Target months of expenses</label>
          <select
            className={styles.select}
            value={emergency.monthsTarget}
            onChange={(e) => updateEmergency("monthsTarget", e.target.value)}
          >
            {EMERGENCY_MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label}>Dedicated emergency amount</label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={styles.input}
            value={emergency.dedicatedAmount}
            onChange={(e) => updateEmergency("dedicatedAmount", e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderInsuranceStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Insurance coverage</h2>
      <p className={styles.sectionSubtitle}>
        Enter cover amount (sum assured) for each policy type.
      </p>

      <div className={styles.grid}>
        {INSURANCE_ENTRIES.flatMap((entry) => [
          (
            <div key={`${entry.key}-cover`} className={styles.fieldRow}>
              <label className={styles.label}>{entry.label}</label>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className={styles.input}
                value={insurance[entry.key] ?? ""}
                onChange={(e) => updateInsurance(entry.key, e.target.value)}
              />
            </div>
          ),
          (
            <div key={`${entry.key}-premium`} className={styles.fieldRow}>
              <label className={styles.label}>{entry.label} premium per year</label>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className={styles.input}
                value={insurance[entry.premiumKey] ?? ""}
                onChange={(e) => updateInsurance(entry.premiumKey, e.target.value)}
              />
            </div>
          ),
        ])}
      </div>
    </div>
  );

  const renderGoalsStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Financial goals</h2>
      <p className={styles.sectionSubtitle}>
        For each goal, enter the amount you roughly have in mind
        today.
      </p>

      <div className={styles.grid}>
        {GOAL_ENTRIES.flatMap((entry) => {
          if (entry.key === "totalGoalValue") {
            return (
              <div key={entry.key} className={styles.fieldRow}>
                <label className={styles.label}>{entry.label}</label>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  className={styles.input}
                  value={goals[entry.key] ?? ""}
                  onChange={(e) => updateGoals(entry.key, e.target.value)}
                />
              </div>
            );
          }

          return [
            (
              <div key={`${entry.key}-amount`} className={styles.fieldRow}>
                <label className={styles.label}>{entry.label}</label>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  className={styles.input}
                  value={goals[entry.key] ?? ""}
                  onChange={(e) => updateGoals(entry.key, e.target.value)}
                />
              </div>
            ),
            (
              <div key={`${entry.key}-horizon`} className={styles.fieldRow}>
                <label className={styles.label}>{entry.label} horizon (years)</label>
                <select
                  className={styles.select}
                  value={goals[entry.horizonKey] ?? ""}
                  onChange={(e) => updateGoals(entry.horizonKey, e.target.value)}
                >
                  {GOAL_HORIZON_OPTIONS.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ),
            (
              <div key={`${entry.key}-priority`} className={styles.fieldRow}>
                <label className={styles.label}>{entry.label} priority</label>
                <select
                  className={styles.select}
                  value={goals[entry.priorityKey] ?? ""}
                  onChange={(e) => updateGoals(entry.priorityKey, e.target.value)}
                >
                  {GOAL_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ),
          ];
        })}
      </div>
    </div>
  );

  const renderRiskStep = () => (
    <div className={styles.stepBody}>
      <h2 className={styles.sectionTitle}>Risk assessment</h2>
      <p className={styles.sectionSubtitle}>
        Tell us how comfortable you are with ups and downs in your investments.
      </p>

      {RISK_QUESTIONS.map((q) => (
        <div key={q.name} className={styles.riskQuestionBlock}>
          <h4 className={styles.riskQuestionTitle}>{q.text}</h4>
          <div className={styles.riskOptionsRow}>
            {q.options.map(([label, value]) => {
              const selected = riskAnswers[q.name] === String(value);
              return (
                <label
                  key={label}
                  className={`${styles.riskOptionPill} ${
                    selected ? styles.riskOptionPillSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={q.name}
                    value={value}
                    checked={selected}
                    onChange={(e) =>
                      handleRiskChange(q.name, e.target.value)
                    }
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {riskError && (
        <p className={styles.formError}>{riskError}</p>
      )}
    </div>
  );

  const renderStepBody = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalStep();
      case 1:
        return renderCashFlowStep();
      case 2:
        return renderAssetsStep();
      case 3:
        return renderLiabilitiesStep();
      case 4:
        return renderEmergencyStep();
      case 5:
        return renderInsuranceStep();
      case 6:
        return renderGoalsStep();
      case 7:
        return renderRiskStep();
      default:
        return renderPersonalStep();
    }
  };


  if (loading) {
    return (
      <div className={styles.fullPageCenter}>
        <div className={styles.loader}>Loading your profile…</div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        {/* Left side stepper / copy */}
        <aside className={styles.leftPane}>
          <div>
            <div className={styles.logoRow}>
              <div className={styles.logoDot} />
              <span className={styles.logoText}>Growfolio</span>
            </div>
            <h1 className={styles.leftHeading}>
              Set up your{" "}
              <span className={styles.highlight}>money profile</span>
            </h1>
            <p className={styles.leftBody}>
              Just {STEPS.length} quick sections. Once you’re done,
              we’ll never ask these again unless you want to update
              them.
            </p>
          </div>

          <ol className={styles.stepList}>
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <li
                  key={step.key}
                  className={`${styles.stepItem} ${
                    isActive ? styles.stepItemActive : ""
                  } ${isCompleted ? styles.stepItemDone : ""}`}
                  onClick={() => goToStep(index)}
                >
                  <div className={styles.stepBullet}>
                    {index + 1 < 10 ? `0${index + 1}` : index + 1}
                  </div>
                  <div>
                    <div className={styles.stepTitle}>{step.label}</div>
                    <div className={styles.stepSubtitle}>
                      {step.key === "personal" &&
                        "Basic personal and income details"}
                      {step.key === "cashFlow" &&
                        "Monthly expenses and lifestyle spending"}
                      {step.key === "assets" &&
                        "Where your wealth is currently parked"}
                      {step.key === "liabilities" &&
                        "Home loans, personal loans and cards"}
                      {step.key === "emergency" &&
                        "Emergency buffer and savings safety net"}
                      {step.key === "insurance" &&
                        "Health and life cover for family"}
                      {step.key === "goals" &&
                        "Education, retirement and other goals"}
                      {step.key === "risk" &&
                        "Your comfort with risk and volatility"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Right side form */}
        <main className={styles.rightPane}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepHeading}>
              {STEPS[currentStep].label}
            </h2>
            <div className={styles.stepCounter}>
              {String(currentStep + 1).padStart(2, "0")} /{" "}
              {String(STEPS.length).padStart(2, "0")}
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>{error}</div>
          )}

          {renderStepBody()}

          <div className={styles.navButtons}>
            {currentStep > 0 && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={goBack}
                disabled={saving}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={isLastStep ? handleSubmit : goNext}
              disabled={saving}
            >
              {isLastStep
                ? saving
                  ? "Saving…"
                  : "Finish"
                : "Next"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
