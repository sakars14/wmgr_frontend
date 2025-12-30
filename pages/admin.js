// frontend/pages/admin.js
import { useEffect, useMemo, useState, Fragment } from "react";
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
  const [zerodhaStatuses, setZerodhaStatuses] = useState({});
  const [zerodhaStatusErr, setZerodhaStatusErr] = useState("");

  // Model buckets
  const [modelBuckets, setModelBuckets] = useState([]);
  const [modelBucketsLoading, setModelBucketsLoading] = useState(false);
  const [modelBucketsMsg, setModelBucketsMsg] = useState("");
  const [modelBucketsErr, setModelBucketsErr] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [publishSelections, setPublishSelections] = useState({});
  const [versionEditor, setVersionEditor] = useState({ bucketId: null, holdingsText: "", notes: "" });
  const [versionSaving, setVersionSaving] = useState(false);

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

  const formatDate = (value) => {
    if (!value) return "—";
    if (typeof value === "string") return value;
    if (typeof value?.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString();
    }
    if (typeof value?._seconds === "number") {
      return new Date(value._seconds * 1000).toLocaleString();
    }
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

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

  async function loadModelBuckets() {
    setModelBucketsLoading(true);
    setModelBucketsErr("");
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/model-buckets/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }
      const buckets = Array.isArray(data?.buckets) ? data.buckets : [];
      setModelBuckets(buckets);

      const selections = {};
      buckets.forEach((bucket) => {
        const versions = bucket.versions || {};
        const ids = Object.keys(versions);
        if (ids.length > 0) {
          selections[bucket.bucketId] = bucket.publishedVersionId || ids[0];
        }
      });
      setPublishSelections(selections);
    } catch (e) {
      console.error(e);
      setModelBucketsErr(e?.message || String(e));
    } finally {
      setModelBucketsLoading(false);
    }
  }

  async function seedModelBuckets() {
    setSeedLoading(true);
    setModelBucketsErr("");
    setModelBucketsMsg("");
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/model-buckets/admin/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }
      setModelBucketsMsg(`Seeded ${data?.seeded ?? 0} buckets.`);
      await loadModelBuckets();
    } catch (e) {
      setModelBucketsErr(e?.message || String(e));
    } finally {
      setSeedLoading(false);
    }
  }

  async function publishModelBucket(bucketId) {
    const versionId = publishSelections[bucketId];
    if (!versionId) {
      setModelBucketsErr("Pick a version to publish.");
      return;
    }
    setModelBucketsErr("");
    setModelBucketsMsg("");
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/model-buckets/admin/${bucketId}/publish/${versionId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }
      setModelBucketsMsg(`Published ${bucketId} -> ${versionId}`);
      await loadModelBuckets();
    } catch (e) {
      setModelBucketsErr(e?.message || String(e));
    }
  }

  async function addBucketVersion(bucketId) {
    setVersionSaving(true);
    setModelBucketsErr("");
    setModelBucketsMsg("");
    try {
      let holdings;
      try {
        holdings = JSON.parse(versionEditor.holdingsText || "");
      } catch (err) {
        throw new Error("Holdings JSON is invalid. Please paste a valid JSON array.");
      }
      if (!Array.isArray(holdings)) {
        throw new Error("Holdings JSON must be an array.");
      }

      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/model-buckets/admin/${bucketId}/versions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ holdings, notes: versionEditor.notes || undefined }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }
      setModelBucketsMsg(`Added version ${data?.versionId || ""} to ${bucketId}.`);
      setVersionEditor({ bucketId: null, holdingsText: "", notes: "" });
      await loadModelBuckets();
    } catch (e) {
      setModelBucketsErr(e?.message || String(e));
    } finally {
      setVersionSaving(false);
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
      if (!res.ok) {
        setError(data?.detail || JSON.stringify(data));
        setAllPlans([]);
        return;
      }
      setAllPlans(Array.isArray(data) ? data : []);
      const uids = Array.from(
        new Set((Array.isArray(data) ? data : []).map((row) => row.clientId).filter(Boolean))
      );
      await loadZerodhaStatuses(uids);
    } catch (e) {
      console.error(e);
      setError(e?.message || String(e));
    } finally {
      setAllPlansLoading(false);
    }
  }

  async function loadZerodhaStatuses(uids) {
    setZerodhaStatusErr("");
    if (!Array.isArray(uids) || uids.length === 0) {
      setZerodhaStatuses({});
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/zerodha-status?uids=${encodeURIComponent(uids.join(","))}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }
      setZerodhaStatuses(data?.statuses || {});
    } catch (e) {
      console.error(e);
      setZerodhaStatusErr(e?.message || String(e));
      setZerodhaStatuses({});
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
      if (!res.ok) {
        setError(data?.detail || JSON.stringify(data));
        setExpandedPlan(null);
        return;
      }
      setExpandedPlan(data?.plan || null);
    } catch (e) {
      console.error(e);
      setExpandedPlan(null);
      setError(e?.message || String(e));
    }
  }

  async function setVisibility(rowClientId, visibility) {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/plans/${rowClientId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || JSON.stringify(data));
        return;
      }
      await loadAllPlans();
    } catch (e) {
      const message = e?.message || String(e);
      setError(message);
      alert(message);
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
    loadModelBuckets();
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
            <button
              onClick={() => setVisibility(clientId, "shared")}
              disabled={!clientId}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #16a34a",
                background: "#16a34a",
                color: "#fff",
                opacity: !clientId ? 0.5 : 1,
              }}
            >
              Share Plan
            </button>
            <button
              onClick={() => setVisibility(clientId, "revoked")}
              disabled={!clientId}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #dc2626",
                background: "#dc2626",
                color: "#fff",
                opacity: !clientId ? 0.5 : 1,
              }}
            >
              Revoke Plan
            </button>
          </div>

          {manualMsg && <div style={{ marginTop: 10, color: "#111827" }}>{manualMsg}</div>}
          {manualNarrationMsg && <div style={{ marginTop: 10, color: "#111827" }}>{manualNarrationMsg}</div>}

          <PlanViewer plan={manualPlan} />
          <NarrationViewer narration={manualNarration} />
        </div>

        {/* SECTION 2: Model buckets */}
        <div style={{ padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Model buckets</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <button
              onClick={seedModelBuckets}
              disabled={seedLoading}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d7deea" }}
            >
              {seedLoading ? "Seeding…" : "Seed defaults"}
            </button>
            <button
              onClick={loadModelBuckets}
              disabled={modelBucketsLoading}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d7deea" }}
            >
              {modelBucketsLoading ? "Refreshing…" : "Refresh"}
            </button>
            {modelBucketsMsg && <span style={{ color: "#065f46", fontSize: 12 }}>{modelBucketsMsg}</span>}
            {modelBucketsErr && <span style={{ color: "#b91c1c", fontSize: 12 }}>{modelBucketsErr}</span>}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Bucket ID</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Risk band</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Active</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Published</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Updated</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modelBuckets.map((bucket) => {
                  const versions = bucket.versions || {};
                  const versionIds = Object.keys(versions);
                  const selectedVersion =
                    publishSelections[bucket.bucketId] || bucket.publishedVersionId || versionIds[0] || "";
                  const isEditing = versionEditor.bucketId === bucket.bucketId;
                  return (
                    <Fragment key={bucket.bucketId}>
                      <tr>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb", fontFamily: "monospace" }}>
                          {bucket.bucketId}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          {bucket.name || "—"}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          {bucket.riskBand || "—"}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          {bucket.isActive ? "Yes" : "No"}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          {bucket.publishedVersionId || "—"}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          {formatDate(bucket.updatedAt)}
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <a
                              href={`/bucket/${bucket.bucketId}?source=model`}
                              style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}
                            >
                              View
                            </a>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                value={selectedVersion}
                                onChange={(e) =>
                                  setPublishSelections((prev) => ({
                                    ...prev,
                                    [bucket.bucketId]: e.target.value,
                                  }))
                                }
                                style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #d7deea" }}
                              >
                                {versionIds.length === 0 && <option value="">No versions</option>}
                                {versionIds.map((versionId) => (
                                  <option key={versionId} value={versionId}>
                                    {versionId}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => publishModelBucket(bucket.bucketId)}
                                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d7deea" }}
                                disabled={!selectedVersion}
                              >
                                Publish
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                setVersionEditor(
                                  isEditing
                                    ? { bucketId: null, holdingsText: "", notes: "" }
                                    : { bucketId: bucket.bucketId, holdingsText: "", notes: "" }
                                )
                              }
                              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d7deea" }}
                            >
                              {isEditing ? "Close add version" : "Add version"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={7} style={{ padding: "10px 0 0 0" }}>
                            <div style={{ padding: "0 10px 12px 10px" }}>
                              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                                Paste holdings JSON array.
                              </div>
                              <textarea
                                rows={6}
                                value={versionEditor.holdingsText}
                                onChange={(e) =>
                                  setVersionEditor((prev) => ({
                                    ...prev,
                                    holdingsText: e.target.value,
                                  }))
                                }
                                placeholder={`[\n  {\"exchange\":\"NSE\",\"symbol\":\"NIFTYBEES\",\"name\":\"Nippon Nifty 50 ETF\",\"assetClass\":\"equity\",\"weight\":0.25},\n  {\"exchange\":\"NSE\",\"symbol\":\"GOLDBEES\",\"name\":\"Gold ETF\",\"assetClass\":\"gold\",\"weight\":0.10}\n]`}
                                style={{ width: "100%", borderRadius: 8, border: "1px solid #d7deea", padding: 8 }}
                              />
                              <input
                                value={versionEditor.notes}
                                onChange={(e) =>
                                  setVersionEditor((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                placeholder="Notes (optional)"
                                style={{ marginTop: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d7deea" }}
                              />
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button
                                  onClick={() => addBucketVersion(bucket.bucketId)}
                                  disabled={versionSaving}
                                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}
                                >
                                  {versionSaving ? "Saving…" : "Save version"}
                                </button>
                                <button
                                  onClick={() => setVersionEditor({ bucketId: null, holdingsText: "", notes: "" })}
                                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d7deea" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!modelBucketsLoading && modelBuckets.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "10px", color: "#6b7280" }}>
                      No model buckets yet. Seed defaults to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: All plans */}
        <div style={{ padding: 14, border: "1px solid #e8edf5", borderRadius: 12, background: "#fff", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>All plans</div>

          {allPlansLoading ? (
            <div>Loading…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {zerodhaStatusErr && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>
                  {zerodhaStatusErr}
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Client ID</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Client name</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Access</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Zerodha</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>View</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Share</th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e8edf5" }}>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlans.map((row) => {
                    const isExpanded = expandedClientId === row.clientId;
                    const visibility = row.planVisibility || (row.shared ? "shared" : "draft");
                    const shared = visibility === "shared";
                    const status = zerodhaStatuses[row.clientId];
                    const connected = status?.connected;
                    const statusLabel =
                      connected === true ? "Connected" : connected === false ? "Not connected" : "N/A";
                    const statusColor =
                      connected === true ? "#16a34a" : connected === false ? "#9ca3af" : "#9ca3af";
                    const badgeColors = {
                      shared: { bg: "#dcfce7", text: "#111827" },
                      revoked: { bg: "#fee2e2", text: "#111827" },
                      draft: { bg: "#fef3c7", text: "#111827" },
                    };
                    const badge = badgeColors[visibility] || badgeColors.draft;
                    return (
                      <Fragment key={row.clientId}>
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
                                background: badge.bg,
                                color: badge.text,
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {visibility}
                            </span>
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #f1f5fb" }}>
                            <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 999,
                                  background: statusColor,
                                  display: "inline-block",
                                }}
                              />
                              <span style={{ color: "#374151" }}>{statusLabel}</span>
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
                              onClick={() => setVisibility(row.clientId, "shared")}
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
                              onClick={() => setVisibility(row.clientId, "revoked")}
                              disabled={visibility === "revoked"}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #d7deea",
                                opacity: visibility === "revoked" ? 0.5 : 1,
                              }}
                            >
                              {visibility === "revoked" ? "Revoked" : "Revoke"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: "10px 0 0 0" }}>
                              <div style={{ padding: "0 10px 12px 10px" }}>
                                <PlanViewer plan={expandedPlan} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
