// frontend/pages/my-plan.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NavBar from "../components/NavBar";
import { auth } from "../lib/firebase";

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

function PlanViewer({ plan }) {
  if (!plan) return null;

  const profileSummary = plan.profileSummary || {};
  const risk = plan.risk || {};
  const currentAllocation = plan.currentAllocation || {};

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
      {(plan.plans || []).map((p) => (
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

  useEffect(() => {
    async function load() {
      const u = auth.currentUser;
      if (!u) {
        router.push("/login");
        return;
      }

      try {
        const token = await u.getIdToken();
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
      } catch (e) {
        setMsg(String(e));
        setPlan(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        <h1>My Plan</h1>
        {loading ? <div>Loading…</div> : msg ? <div style={{ color: "#b91c1c" }}>{msg}</div> : <PlanViewer plan={plan} />}
      </div>
    </>
  );
}
