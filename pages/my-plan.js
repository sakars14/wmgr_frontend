// frontend/pages/my-plan.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";

const SIP_DELTA_OPTIONS = [-50000, -20000, -10000, 0, 5000, 10000, 20000, 50000];
const SIP_TARGET_OPTIONS = [
  { value: "EQUITY_MF", label: "Equity MF" },
  { value: "DEBT_MF", label: "Debt MF" },
  { value: "SPLIT_50_50", label: "Split 50 / 50" },
];
const DEBT_TARGET_OPTIONS = [
  { value: "AUTO", label: "Auto (highest priority)" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "PERSONAL_LOAN", label: "Personal loan" },
  { value: "VEHICLE_LOAN", label: "Vehicle loan" },
  { value: "OTHERS", label: "Other loans" },
];
const DEBT_PREPAY_OPTIONS = [0, 5000, 10000, 20000, 50000];
const EMERGENCY_TARGET_OPTIONS = [
  { value: "KEEP", label: "Keep current" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
];

function money(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `₹${num.toLocaleString("en-IN")}`;
}

function pct(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `${num}%`;
}

function pickRecommendedBucket(payload) {
  const buckets =
    (payload && Array.isArray(payload.buckets) && payload.buckets) ||
    (Array.isArray(payload) && payload) ||
    [];

  const recId =
    (payload && (payload.recommendedBucketId || payload.recommended_bucket_id)) || null;

  const byFlag = buckets.find(
    (b) =>
      b?.isRecommended === true ||
      b?.recommended === true ||
      b?.is_recommended === true ||
      b?.recommendedBucket === true
  );

  const byId = recId
    ? buckets.find((b) => (b?.bucketId || b?.id) === recId)
    : null;

  const riskHint =
    payload?.recommendedRiskBand || payload?.recommended_risk_band || payload?.riskBand || null;

  const byRisk = riskHint
    ? buckets.find((b) => (b?.riskBand || b?.risk_band) === riskHint)
    : null;

  return byFlag || byId || byRisk || buckets[0] || null;
}

function normalizeLabel(value) {
  return String(value || "").toLowerCase().trim();
}

function resolveRecommendedPlanKey(risk) {
  const raw = normalizeLabel(
    risk?.finalBand || risk?.quizLabel || risk?.band || risk?.label || ""
  );
  if (!raw) return "";
  if (raw.includes("low") || raw.includes("conservative") || raw.includes("safety")) {
    return "safety";
  }
  if (raw.includes("balanced") || raw.includes("moderate")) {
    return "balanced";
  }
  if (raw.includes("high") || raw.includes("aggressive") || raw.includes("growth")) {
    return "growth";
  }
  return "";
}

function planMatchesKey(planItem, key) {
  if (!key) return false;
  const target = normalizeLabel(key);
  const name = normalizeLabel(planItem?.name);
  const id = normalizeLabel(planItem?.id || planItem?.key || planItem?.slug);
  const aliases = {
    safety: ["safety", "low", "conservative"],
    balanced: ["balanced", "moderate"],
    growth: ["growth", "high", "aggressive"],
  };
  const checks = aliases[target] || [target];
  return checks.some((token) => id.includes(token) || name.includes(token));
}

function PlanViewer({ plan }) {
  if (!plan) return null;

  const profileSummary = plan.profileSummary || {};
  const risk = plan.risk || {};
  const currentAllocation = plan.currentAllocation || {};
  const planItems = Array.isArray(plan.plans) ? plan.plans : [];
  const recommendedPlanKey = resolveRecommendedPlanKey(risk);
  const selectedPlan =
    (recommendedPlanKey && planItems.find((p) => planMatchesKey(p, recommendedPlanKey))) ||
    planItems.find((p) => p.recommended) ||
    planItems[0] ||
    null;
  const displayPlans = selectedPlan
    ? [
        {
          ...selectedPlan,
          recommended:
            selectedPlan.recommended ||
            (recommendedPlanKey && planMatchesKey(selectedPlan, recommendedPlanKey)),
        },
      ]
    : [];

  return (
    <div style={{ marginTop: 14, padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Your generated plan</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid #eef2f8", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Profile</div>
          <div>Age: {profileSummary.age ?? "—"}</div>
          <div>City: {profileSummary.city ?? "—"}</div>
          <div>Annual income: {money(profileSummary.annualIncome)}</div>
          <div>Monthly savings: {money(profileSummary.monthlySavings)}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #eef2f8", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Risk</div>
          <div>Quiz score: {risk.quizScore ?? "—"}</div>
          <div>Quiz label: {risk.quizLabel ?? "—"}</div>
          <div>Final band: {risk.finalBand ?? "—"}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #eef2f8", borderRadius: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Current allocation</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <div>Equity: {pct(currentAllocation.equityPct)}</div>
          <div>Debt: {pct(currentAllocation.debtPct)}</div>
          <div>Gold: {pct(currentAllocation.goldPct)}</div>
          <div>Cash: {pct(currentAllocation.cashPct)}</div>
          <div>Alt/RE: {pct(currentAllocation.realEstateAltPct)}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, fontWeight: 900 }}>Plans</div>
      {displayPlans.map((p) => (
        <div key={p.id} style={{ marginTop: 10, padding: 12, border: "1px solid #eef2f8", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>
              {p.name} {p.recommended ? "• Recommended" : ""}
            </div>
            <div style={{ fontWeight: 900 }}>{money(p.price)}</div>
          </div>
          <div style={{ marginTop: 6, color: "#4b5563" }}>{p.summary}</div>

          {!!(p.bullets || []).length && (
            <ul style={{ marginTop: 10 }}>
              {p.bullets.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyPlan() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [plan, setPlan] = useState(null);
  const [planVisibility, setPlanVisibility] = useState("");
  const [goalProjections, setGoalProjections] = useState([]);
  const [goalAssumptions, setGoalAssumptions] = useState(null);
  const [sipDeltaMonthly, setSipDeltaMonthly] = useState(0);
  const [sipTarget, setSipTarget] = useState("EQUITY_MF");
  const [debtPrepayMonthly, setDebtPrepayMonthly] = useState(0);
  const [debtTarget, setDebtTarget] = useState("AUTO");
  const [emergencyTargetMonths, setEmergencyTargetMonths] = useState("KEEP");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [simulationRequest, setSimulationRequest] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [recommendedBucketsPayload, setRecommendedBucketsPayload] = useState(null);
  const [recommendedError, setRecommendedError] = useState("");

  useEffect(() => {
    async function load() {
      const u = auth.currentUser;
      if (!u) {
        router.push("/login");
        return;
      }

      try {
        const token = await u.getIdToken();
        const visibilityRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/shared/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const visibilityData = await visibilityRes.json();
        if (!visibilityRes.ok) {
          setMsg(visibilityData?.detail || "Your plan is not available yet.");
          setPlan(null);
          return;
        }

        const visibility =
          visibilityData?.planVisibility ||
          (visibilityData?.shared ? "shared" : "draft");
        setPlanVisibility(visibility);

        if (visibility !== "shared") {
          setMsg("Your plan is being reviewed. You can review your inputs on the Profile page.");
          setPlan(null);
          setRecommendedBucketsPayload(null);
          setRecommendedError("");
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg(data?.detail || "Your plan is not available yet.");
          setPlan(null);
          return;
        }
        setMsg("");
        setPlan(data?.plan || null);
        const blueprint = data?.blueprint || null;
        const projections = blueprint?.derived?.goalProjections || [];
        setGoalProjections(Array.isArray(projections) ? projections : []);
        setGoalAssumptions(blueprint?.meta?.assumptions || blueprint?.assumptions || null);

        try {
          setRecommendedError("");
          const recRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/model-buckets/recommended`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const recData = await recRes.json();
          if (!recRes.ok) {
            throw new Error(recData?.detail || "Failed to load recommended buckets");
          }
          setRecommendedBucketsPayload(recData);
        } catch (err) {
          setRecommendedBucketsPayload(null);
          setRecommendedError(err.message || "Failed to load recommended buckets");
        }
      } catch (e) {
        setMsg(String(e));
        setPlan(null);
        setGoalProjections([]);
        setGoalAssumptions(null);
        setRecommendedBucketsPayload(null);
        setRecommendedError("");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const formatInr = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return `INR ${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };

  const formatDelta = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    const sign = num > 0 ? "+" : "";
    return `${sign}${formatInr(num)}`;
  };

  const formatPercent = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return `${(num * 100).toFixed(1)}%`;
  };

  const priorityBadge = (priority) => {
    const value = String(priority || "Unknown");
    const colors = {
      High: { background: "#fee2e2", color: "#991b1b" },
      Medium: { background: "#fef3c7", color: "#92400e" },
      Low: { background: "#dcfce7", color: "#166534" },
      Unknown: { background: "#e5e7eb", color: "#374151" },
    };
    const style = colors[value] || colors.Unknown;
    return (
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, ...style }}>
        {value}
      </span>
    );
  };

  const statusBadge = (status) => {
    const value = String(status || "Unknown");
    const colors = {
      OnTrack: { background: "#dcfce7", color: "#166534" },
      Shortfall: { background: "#fee2e2", color: "#991b1b" },
      NotFeasible: { background: "#fde2e2", color: "#7f1d1d" },
      Unknown: { background: "#e5e7eb", color: "#374151" },
    };
    const style = colors[value] || colors.Unknown;
    return (
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, ...style }}>
        {value}
      </span>
    );
  };

  const formatMixPercent = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return `${Math.round(num * 100)}%`;
  };

  const inflationRate = goalAssumptions?.inflationRateAnnualDefault;
  const inflationText = Number.isFinite(inflationRate)
    ? `${(inflationRate * 100).toFixed(1)}%`
    : "-";
  const horizonRules = goalAssumptions?.horizonReturnMixRules;
  const returnRulesText = horizonRules
    ? `<=${horizonRules.debtMaxYears}y debt, ${horizonRules.debtMaxYears}-${horizonRules.blendedMaxYears}y blended 50/50, >=${horizonRules.blendedMaxYears}y equity.`
    : "<=3y debt, 3-7y blended 50/50, >=7y equity.";

  const buildScenarioName = () => {
    const sipPart = `SIP ${sipDeltaMonthly >= 0 ? "+" : ""}${sipDeltaMonthly}`;
    const debtPart = `Debt ${debtPrepayMonthly}`;
    const emergencyPart =
      emergencyTargetMonths === "KEEP"
        ? "Emergency keep"
        : `Emergency ${emergencyTargetMonths}m`;
    return `${sipPart}, ${debtPart}, ${emergencyPart}`;
  };

  const recommendedBucket = pickRecommendedBucket(recommendedBucketsPayload);
  const displayBuckets = recommendedBucket ? [recommendedBucket] : [];

  const handleSimulate = async () => {
    try {
      setSimError("");
      setSaveMsg("");
      setSimLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace("/");
        return;
      }
      const token = await currentUser.getIdToken();
      const request = {
        projectionMonths: 12,
        sipDeltaMonthly: Number(sipDeltaMonthly),
        sipTarget,
        debtPrepayMonthly: Number(debtPrepayMonthly),
        debtTarget,
        emergencyTargetMonths:
          emergencyTargetMonths === "KEEP" ? null : Number(emergencyTargetMonths),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/simulate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Simulation failed");
      }
      setSimulation(data);
      setSimulationRequest(request);
    } catch (err) {
      console.error(err);
      setSimError(err.message || "Simulation failed. Please try again.");
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    try {
      if (!simulation || !simulationRequest) return;
      const name = window.prompt("Name this scenario", buildScenarioName());
      if (!name) return;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace("/");
        return;
      }
      const token = await currentUser.getIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/simulations/save`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            simulationRequest,
            simulationResponse: simulation,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to save scenario");
      }
      setSaveMsg("Scenario saved.");
    } catch (err) {
      console.error(err);
      setSaveMsg(err.message || "Failed to save scenario.");
    }
  };

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        <h1>My Plan</h1>
        {loading ? (
          <div>Loading…</div>
        ) : msg ? (
          <div style={{ padding: 12, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Plan status: {planVisibility || "pending"}</div>
            <div>{msg}</div>
          </div>
        ) : (
          <>
            <PlanViewer plan={plan} />

            {planVisibility === "shared" && (
              <>
                {displayBuckets.length > 0 && (
                  <section style={{ marginTop: 18 }}>
                    <div style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid #e8edf5", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontWeight: 700 }}>Recommended bucket</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>Based on your risk profile</div>
                      </div>
                      {recommendedError && (
                        <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 8 }}>{recommendedError}</div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        {displayBuckets.map((bucket) => {
                          const bucketId = bucket?.bucketId || bucket?.id;
                          const mix = bucket.assetMix || {};
                          const mixItems = [
                            { label: "Equity", value: mix.equity },
                            { label: "Debt", value: mix.debt },
                            { label: "Gold", value: mix.gold },
                            { label: "Cash", value: mix.cash },
                          ].filter((item) => Number(item.value) > 0);
                          const isRecommended = true;
                          return (
                            <div key={bucketId || bucket.name} style={{ border: "1px solid #eef2f8", borderRadius: 12, padding: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ fontWeight: 700 }}>{bucket.name || bucket.bucketId || bucket.id}</div>
                                {isRecommended && (
                                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "#dcfce7", color: "#166534" }}>
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{bucket.riskBand}</div>
                              {mixItems.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                                  {mixItems.map((item) => (
                                    <span key={item.label} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "#f1f5f9", color: "#475569" }}>
                                      {item.label} {formatMixPercent(item.value)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div style={{ marginTop: 12 }}>
                                <a
                                  href={bucketId ? `/bucket/${bucketId}?source=model` : "#"}
                                  style={{
                                    display: "inline-block",
                                    padding: "6px 12px",
                                    borderRadius: 999,
                                    border: "1px solid #2563eb",
                                    color: "#2563eb",
                                    fontSize: 12,
                                    textDecoration: "none",
                                  }}
                                >
                                  View bucket
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                <section style={{ marginTop: 18 }}>
                  <div style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid #e8edf5", background: "#fff" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Goals projection</div>
                    {goalProjections.length === 0 ? (
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Add goals to see projections.
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Goal</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Horizon</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Priority</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Future cost</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Assumed return</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Required SIP</th>
                              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goalProjections.map((goal, idx) => {
                              const shortfall = Number(goal.shortfallMonthlyRounded || 0);
                              return (
                                <tr key={goal.goalKey || goal.label || String(idx)}>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    <div style={{ fontWeight: 600 }}>{goal.label || goal.goalKey}</div>
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    {goal.horizonYears ? `${goal.horizonYears}y` : "-"}
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    {priorityBadge(goal.priority)}
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    {formatInr(goal.futureCostInflated)}
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    {formatPercent(goal.assumedReturnAnnual)}
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    {formatInr(goal.requiredMonthlyInvestmentRounded)} / month
                                  </td>
                                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                                    <div>{statusBadge(goal.status)}</div>
                                    {goal.status === "Shortfall" && shortfall > 0 && (
                                      <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                                        Short by {formatInr(shortfall)} / month
                                      </div>
                                    )}
                                    {goal.status === "NotFeasible" && shortfall > 0 && (
                                      <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4 }}>
                                        Short by {formatInr(shortfall)} / month
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
                      Assumptions: inflation {inflationText} per year. Return basis: {returnRulesText}
                    </div>
                  </div>
                </section>

                <section style={{ marginTop: 18 }}>
                <div style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid #e8edf5", background: "#fff" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Explore Options</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>
                    Adjust these knobs to see how your plan changes over 12 months.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>SIP change (monthly)</div>
                      <select
                        value={sipDeltaMonthly}
                        onChange={(e) => setSipDeltaMonthly(Number(e.target.value))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                      >
                        {SIP_DELTA_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt >= 0 ? `+${opt}` : opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>SIP target</div>
                      <select
                        value={sipTarget}
                        onChange={(e) => setSipTarget(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                      >
                        {SIP_TARGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Debt prepay (monthly)</div>
                      <select
                        value={debtPrepayMonthly}
                        onChange={(e) => setDebtPrepayMonthly(Number(e.target.value))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                      >
                        {DEBT_PREPAY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Debt target</div>
                      <select
                        value={debtTarget}
                        onChange={(e) => setDebtTarget(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                      >
                        {DEBT_TARGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Emergency target months</div>
                      <select
                        value={emergencyTargetMonths}
                        onChange={(e) => setEmergencyTargetMonths(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                      >
                        {EMERGENCY_TARGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleSimulate}
                      disabled={simLoading}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid #2563eb",
                        background: "#2563eb",
                        color: "#fff",
                        opacity: simLoading ? 0.7 : 1,
                      }}
                    >
                      {simLoading ? "Simulating..." : "Simulate"}
                    </button>
                    {simError && <span style={{ color: "#b91c1c", fontSize: 12 }}>{simError}</span>}
                    {saveMsg && <span style={{ color: "#065f46", fontSize: 12 }}>{saveMsg}</span>}
                  </div>

                  {simulation && (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fafafa" }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Results</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Monthly surplus</div>
                          <div style={{ fontWeight: 600 }}>
                            {formatInr(simulation?.baseBlueprint?.derived?.surplus?.monthlySurplus)} {' -> '} {formatInr(simulation?.simulatedBlueprint?.derived?.surplus?.monthlySurplus)}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            Delta: {formatDelta(simulation?.deltas?.monthlySurplusDelta)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Emergency gap</div>
                          <div style={{ fontWeight: 600 }}>
                            {formatInr(simulation?.baseBlueprint?.derived?.emergency?.gap)} {' -> '} {formatInr(simulation?.simulatedBlueprint?.derived?.emergency?.gap)}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            Status: {simulation?.baseBlueprint?.derived?.emergency?.status || "-"} {' -> '} {simulation?.simulatedBlueprint?.derived?.emergency?.status || "-"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Targeted debt outstanding</div>
                          <div style={{ fontWeight: 600 }}>
                            {formatInr(simulation?.deltas?.debtOutstandingBefore)} {' -> '} {formatInr(simulation?.deltas?.debtOutstandingAfter)}
                          </div>
                        </div>
                      </div>

                      {!!(simulation?.highlights || []).length && (
                        <ul style={{ margin: "12px 0 0 18px", color: "#374151" }}>
                          {simulation.highlights.map((item, idx) => (
                            <li key={`${item}-${idx}`} style={{ marginBottom: 6 }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveScenario}
                        style={{
                          marginTop: 12,
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: "1px solid #16a34a",
                          background: "#16a34a",
                          color: "#fff",
                        }}
                      >
                        Save this scenario
                      </button>
                    </div>
                  )}
                </div>
              </section>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
