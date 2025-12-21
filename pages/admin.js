// frontend/pages/admin.js
import { useEffect, useMemo, useState } from "react";
//import NavBar from "../components/NavBar";
import { auth } from "../lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

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
  // If your engine ever returns 0-1 fractions, uncomment the next line:
  // const p = num <= 1 ? num * 100 : num;
  const p = num;
  return `${p}%`;
}

function KVTable({ title, rows }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e8edf5", width: 220, color: "#374151" }}>
                  {k}
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e8edf5" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanViewer({ plan }) {
  if (!plan) return null;

  const profileSummary = plan.profileSummary || {};
  const risk = plan.risk || {};
  const currentAllocation = plan.currentAllocation || {};

  return (
    <div style={{ marginTop: 14, padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff" }}>
      <KVTable
        title="Profile summary"
        rows={[
          ["UID", profileSummary.uid || "—"],
          ["Age", profileSummary.age ?? "—"],
          ["City", profileSummary.city ?? "—"],
          ["Annual income", money(profileSummary.annualIncome)],
          ["Monthly savings", money(profileSummary.monthlySavings)],
          ["Capacity score", profileSummary.capacityScore ?? "—"],
          ["Capacity band", profileSummary.capacityBand ?? "—"],
        ]}
      />

      <KVTable
        title="Risk"
        rows={[
          ["Quiz score", risk.quizScore ?? "—"],
          ["Quiz label", risk.quizLabel ?? "—"],
          ["Final band", risk.finalBand ?? "—"],
        ]}
      />

      <KVTable
        title="Current allocation"
        rows={[
          ["Equity", pct(currentAllocation.equityPct)],
          ["Debt", pct(currentAllocation.debtPct)],
          ["Gold", pct(currentAllocation.goldPct)],
          ["Cash", pct(currentAllocation.cashPct)],
          ["Real estate / Alt", pct(currentAllocation.realEstateAltPct)],
        ]}
      />

      <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 10 }}>Generated plans</div>

      {(plan.plans || []).map((p) => (
        <div
          key={p.id}
          style={{
            padding: 12,
            marginBottom: 12,
            border: "1px solid #eef2f8",
            borderRadius: 12,
            background: "#fbfcff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {p.name} {p.recommended ? "• Recommended" : ""}
            </div>
            <div style={{ fontWeight: 800 }}>{money(p.price)}</div>
          </div>
          <div style={{ marginTop: 6, color: "#4b5563" }}>{p.summary}</div>

          <div style={{ marginTop: 10, fontWeight: 700 }}>Target allocation (percent)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e8edf5" }}>Asset</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e8edf5" }}>%</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e8edf5" }}>Target value</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e8edf5" }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(p.targetAllocationPct || {}).map((k) => (
                  <tr key={k}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef2f8" }}>{k}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef2f8" }}>{pct(p.targetAllocationPct[k])}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef2f8" }}>
                      {money((p.targetAllocationValue || {})[k])}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef2f8" }}>{money((p.deltasValue || {})[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!!(p.bullets || []).length && (
            <>
              <div style={{ marginTop: 10, fontWeight: 700 }}>Notes</div>
              <ul style={{ marginTop: 6 }}>
                {p.bullets.map((b, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {b}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function NarrationViewer({ narration }) {
  if (!narration) return null;

  const planSummary = narration.planSummary || {};

  return (
    <div style={{ marginTop: 14, padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Narration</div>

      <KVTable
        title="Narration summary"
        rows={[
          ["One-liner", planSummary.oneLiner || "-"],
          ["Risk band", planSummary.riskBand || "-"],
          ["Health label", planSummary.healthScoreLabel || "-"],
        ]}
      />

      {!!(narration.sections || []).length && (
        <>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Sections</div>
          {narration.sections.map((section, idx) => (
            <div key={`${section.title}-${idx}`} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{section.title}</div>
              <div style={{ whiteSpace: "pre-wrap", color: "#4b5563" }}>{section.markdown}</div>
            </div>
          ))}
        </>
      )}

      {!!(narration.actionChecklist || []).length && (
        <>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Action checklist</div>
          <ul style={{ marginTop: 6 }}>
            {narration.actionChecklist.map((item) => (
              <li key={item.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {item.title} <span style={{ fontWeight: 600, color: "#374151" }}>({item.priority})</span>
                </div>
                <div style={{ color: "#4b5563" }}>{item.why}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!(narration.clarifyingQuestions || []).length && (
        <>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Missing info to confirm</div>
          <ul style={{ marginTop: 6 }}>
            {narration.clarifyingQuestions.map((item) => (
              <li key={item.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{item.question}</div>
                <div style={{ color: "#4b5563" }}>{item.whyItMatters}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!(narration.disclosures || []).length && (
        <>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Disclosures</div>
          <ul style={{ marginTop: 6 }}>
            {narration.disclosures.map((item, idx) => (
              <li key={`${item}-${idx}`} style={{ marginBottom: 6 }}>
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function Admin() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  // Manual runner
  const [clientId, setClientId] = useState("");
  const [manualPlan, setManualPlan] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMsg, setManualMsg] = useState("");
  const [manualNarration, setManualNarration] = useState(null);
  const [manualNarrationLoading, setManualNarrationLoading] = useState(false);
  const [manualNarrationMsg, setManualNarrationMsg] = useState("");

  // All plans
  const [allPlans, setAllPlans] = useState([]);
  const [allPlansLoading, setAllPlansLoading] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);

  function waitForUser(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error("Not signed in"));
      }, timeoutMs);
  
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          clearTimeout(timer);
          unsub();
          resolve(u);
        }
      });
    });
  }
  
  async function getToken() {
    const u = auth.currentUser || (await waitForUser());
    return await u.getIdToken();
  }  

  async function copyToken() {
    try {
      const token = await getToken();
      await navigator.clipboard.writeText(token);
      setManualMsg("✅ Token copied to clipboard");
      setTimeout(() => setManualMsg(""), 2000);
    } catch (e) {
      setManualMsg(`❌ ${String(e)}`);
    }
  }

  async function runRecommendations() {
    setManualLoading(true);
    setManualMsg("");
    setManualPlan(null);
    setManualNarration(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/recommendations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientId ? { clientId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
      setManualPlan(data);
      setManualMsg("✅ Plan generated (and saved in clientPlans)");
    } catch (e) {
      setManualMsg(`❌ ${String(e)}`);
    } finally {
      setManualLoading(false);
    }
  }

  async function runNarration() {
    setManualNarrationLoading(true);
    setManualNarrationMsg("");
    setManualNarration(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/plans/narration`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientId ? { clientId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
      setManualNarration(data);
      setManualNarrationMsg("Narration generated (and saved in clientPlans)");
    } catch (e) {
      setManualNarrationMsg(`Error: ${String(e)}`);
    } finally {
      setManualNarrationLoading(false);
    }
  }

  async function loadAllPlans() {
    setAllPlansLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
      setAllPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      // keep it visible but non-blocking
      console.error(e);
    } finally {
      setAllPlansLoading(false);
    }
  }

  async function toggleViewPlan(rowClientId) {
    if (expandedClientId === rowClientId) {
      setExpandedClientId(null);
      setExpandedPlan(null);
      return;
    }

    setExpandedClientId(rowClientId);
    setExpandedPlan(null);

    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/plans/${rowClientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
      setExpandedPlan(data?.plan || null);
    } catch (e) {
      console.error(e);
      setExpandedPlan(null);
    }
  }

  async function setShare(rowClientId, shared) {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/plans/${rowClientId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shared }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
      await loadAllPlans();
    } catch (e) {
      alert(String(e));
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const u = auth.currentUser;
        if (!u) {
          setError("Not signed in.");
          return;
        }
        const token = await u.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setMetrics(data);
        else setError(data?.detail || "Failed to load admin data");
      } catch (e) {
        setError(`Failed to load admin data: ${e}`);
      }
    }
    load();
    loadAllPlans();
  }, []);

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        <h1 style={{ marginBottom: 10 }}>Admin</h1>

        {/* SECTION 1: Manual plan generation */}
        <div style={{ padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Manual plan generation</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client UID (optional)"
              style={{
                padding: "10px 12px",
                border: "1px solid #d7deea",
                borderRadius: 10,
                minWidth: 320,
              }}
            />
            <button onClick={copyToken} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d7deea" }}>
              Copy Firebase ID token
            </button>
            <button
              onClick={runRecommendations}
              disabled={manualLoading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                opacity: manualLoading ? 0.7 : 1,
              }}
            >
              {manualLoading ? "Running…" : "Run /plans/recommendations"}
            </button>
            <button
              onClick={runNarration}
              disabled={manualNarrationLoading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #0f766e",
                background: "#0f766e",
                color: "#fff",
                opacity: manualNarrationLoading ? 0.7 : 1,
              }}
            >
              {manualNarrationLoading ? "Generating…" : "Generate Narration"}
            </button>
          </div>

          {manualMsg && <div style={{ marginTop: 10, color: "#111827" }}>{manualMsg}</div>}
          {manualNarrationMsg && <div style={{ marginTop: 10, color: "#111827" }}>{manualNarrationMsg}</div>}

          <PlanViewer plan={manualPlan} />
          <NarrationViewer narration={manualNarration} />
        </div>

        {/* SECTION 2: All plans */}
        <div style={{ padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>All plans</div>

          {allPlansLoading ? (
            <div>Loading…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Client ID</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Client name</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Access</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>View</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Share</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlans.map((row) => {
                    const isExpanded = expandedClientId === row.clientId;
                    const shared = !!row.shared;
                    return (
                      <>
                        <tr key={row.clientId}>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb", fontFamily: "monospace" }}>
                            {row.clientId}
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>{row.clientName || "—"}</td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: shared ? "#dcfce7" : "#fee2e2",
                                color: "#111827",
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {shared ? "Shared" : "Revoked"}
                            </span>
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                            <button
                              onClick={() => toggleViewPlan(row.clientId)}
                              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d7deea" }}
                            >
                              {isExpanded ? "Collapse" : "View plan"}
                            </button>
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                            <button
                              onClick={() => setShare(row.clientId, true)}
                              disabled={shared}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #d7deea",
                                opacity: shared ? 0.5 : 1,
                              }}
                            >
                              {shared ? "Shared" : "Share"}
                            </button>
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                            <button
                              onClick={() => setShare(row.clientId, false)}
                              disabled={!shared}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #d7deea",
                                opacity: !shared ? 0.5 : 1,
                              }}
                            >
                              {!shared ? "Revoked" : "Revoke"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${row.clientId}-expanded`}>
                            <td colSpan={6} style={{ padding: "10px 0 0 0" }}>
                              <div style={{ padding: "0 10px 12px 10px" }}>
                                <PlanViewer plan={expandedPlan} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Existing metrics block (keep your current behavior) */}
        <h2 style={{ marginTop: 24 }}>Admin metrics</h2>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {!metrics ? (
          <p>Loading…</p>
        ) : (
          <div style={{ padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff" }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>Buckets</div>
                <div>{metrics?.bucketsCount ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>Active subs</div>
                <div>{metrics?.activeSubsCount ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>Payments</div>
                <div>{metrics?.paymentsCount ?? "—"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
