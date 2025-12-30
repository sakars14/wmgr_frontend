// pages/bucket/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
//import { usePlan } from "../../lib/usePlan";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
//const PLAN_LIMIT = { none: 0, standard: 5, pro: 8, max: 10 };

function BucketPerformanceChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 520;
  const height = 200;
  const padding = 24;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const xStep =
    data.length > 1 ? (width - 2 * padding) / (data.length - 1) : 0;
  const yScale = max === min ? 1 : (height - 2 * padding) / (max - min);

  const points = data.map((d, idx) => {
    const x = padding + idx * xStep;
    const y = height - padding - (d.value - min) * yScale;
    return { x, y };
  });

  const pathD = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", maxWidth: 520, height: "auto" }}
    >
      {/* baseline */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#ddd"
      />
      {/* line */}
      <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" />
      {/* area under line */}
      <path
        d={
          pathD +
          ` L ${points[points.length - 1].x} ${height - padding}` +
          ` L ${points[0].x} ${height - padding} Z`
        }
        fill="rgba(37, 99, 235, 0.08)"
      />
      {/* end dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill="#2563eb"
        />
      )}
    </svg>
  );
}

// try to parse a “number” from id/name if rank not provided
function deriveRank(obj, fallback = 999) {
  const text = (obj?.id || obj?.name || "").toString();
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : fallback;
}

export default function BucketDetail({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const isModel = router.query.source === "model";
  const [bucket, setBucket] = useState(null);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [orderErr, setOrderErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState("");
  const [budgetInr, setBudgetInr] = useState("");
  const [zerodhaConnected, setZerodhaConnected] = useState(null);
  const [zerodhaUpdatedAt, setZerodhaUpdatedAt] = useState(null);
  const [monthlySurplus, setMonthlySurplus] = useState(null);
  const [suggestedBudget, setSuggestedBudget] = useState(null);
  const [loadingPlanMeta, setLoadingPlanMeta] = useState(false);
  //const { plan } = usePlan(user);

  //const limit = PLAN_LIMIT[plan] ?? 0;

  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState("1Y");

  // demo series — tweak freely
  const DEMO_SERIES = {
    "1M": [
      { label: "Day 1", value: 100 },
      { label: "Day 5", value: 101 },
      { label: "Day 10", value: 102 },
      { label: "Day 15", value: 103 },
      { label: "Day 20", value: 104 },
      { label: "Day 25", value: 105 },
      { label: "Day 30", value: 106 },
    ],
    "1Y": [
      { label: "Nov", value: 100 },
      { label: "Dec", value: 102 },
      { label: "Jan", value: 105 },
      { label: "Feb", value: 103 },
      { label: "Mar", value: 107 },
      { label: "Apr", value: 110 },
      { label: "May", value: 114 },
      { label: "Jun", value: 118 },
      { label: "Jul", value: 121 },
      { label: "Aug", value: 125 },
      { label: "Sep", value: 129 },
      { label: "Oct", value: 132 },
    ],
    "3Y": [
      { label: "Year 1", value: 100 },
      { label: "Year 2", value: 120 },
      { label: "Year 3", value: 145 },
    ],
  };

  const chartData = DEMO_SERIES[range] ?? DEMO_SERIES["1Y"];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user || !id) return;
        setErr("");
        setLoadingPlanMeta(true);
        const token = await auth.currentUser.getIdToken();
        const endpoint = isModel ? "model-buckets" : "buckets";

        const statusPromise = (async () => {
          try {
            const res = await fetch(`${API_BASE}/auth/zerodha/status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const statusData = await res.json();
            if (alive) {
              setZerodhaConnected(Boolean(statusData?.connected));
              setZerodhaUpdatedAt(statusData?.updatedAt || statusData?.connectedAt || null);
            }
            return statusData;
          } catch (e) {
            if (alive) {
              setZerodhaConnected(false);
              setZerodhaUpdatedAt(null);
            }
            return null;
          }
        })();

        const planPromise = (async () => {
          try {
            const res = await fetch(`${API_BASE}/plans/my`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const planData = await res.json();
            const surplus = planData?.blueprint?.derived?.surplus?.monthlySurplus;
            const surplusNum = Number(surplus);
            if (!Number.isFinite(surplusNum)) return;
            if (alive) {
              setMonthlySurplus(surplusNum);
              setSuggestedBudget(surplusNum);
              const currentBudget = Number(budgetInr);
              if (!budgetInr || !Number.isFinite(currentBudget) || currentBudget <= 0) {
                setBudgetInr(String(Math.round(surplusNum)));
              }
            }
          } catch (e) {
            // ignore
          }
        })();

        const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        let normalized = null;
        if (isModel) {
          const header = data?.bucket || {};
          const version = data?.version || {};
          const holdings = Array.isArray(version.holdings) ? version.holdings : [];
          const priced = Array.isArray(data?.pricedHoldings) ? data.pricedHoldings : [];
          const priceByKey = new Map(
            priced.map((p) => [
              `${p.exchange ?? "NSE"}:${p.symbol}`,
              p.price ?? p.ltp ?? null,
            ])
          );
          const merged = holdings.map((h) => {
            const exchange = h.exchange ?? "NSE";
            const symbol = h.symbol;
            return {
              ...h,
              exchange,
              symbol,
              price: priceByKey.get(`${exchange}:${symbol}`) ?? null,
            };
          });
          normalized = {
            ...header,
            id: header.bucketId ?? id,
            name: header.name ?? id,
            items: merged,
            legs: merged,
          };
        } else {
          normalized = {
            ...data,
            id: data.id ?? data.bucketId ?? id,
            name: data.name ?? data.title ?? id,
            items: Array.isArray(data.items) ? data.items : (Array.isArray(data.legs) ? data.legs : []),
          };
        }
        if (alive) {
          setBucket(normalized);
          setPreview(null);
          setPreviewErr("");
          setOrderErr("");
        }
        const statusData = await statusPromise;
        if (alive && statusData?.connected && normalized) {
          try {
            const instruments = Array.from(
              new Set(
                (normalized.items ?? normalized.legs ?? [])
                  .map((item) => `${item.exchange ?? "NSE"}:${item.symbol}`)
                  .filter(Boolean)
              )
            );
            if (instruments.length) {
              const quotesRes = await fetch(`${API_BASE}/zerodha/quotes`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ instruments }),
              });
              if (quotesRes.ok) {
                const quoteData = await quotesRes.json();
                const prices = quoteData?.prices || {};
                if (alive) {
                  setBucket((prev) => {
                    if (!prev) return prev;
                    const items = (prev.items ?? prev.legs ?? []).map((item) => {
                      const key = `${item.exchange ?? "NSE"}:${item.symbol}`;
                      const price = prices[key];
                      if (typeof price !== "number") return item;
                      return { ...item, price, ltp: price };
                    });
                    return { ...prev, items, legs: items };
                  });
                }
              }
            }
          } catch (e) {
            // ignore quotes errors
          }
        }
        await Promise.allSettled([planPromise]);
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoadingPlanMeta(false);
      }
    })();
    return () => { alive = false; };
  }, [user, id, isModel]);

  const locked = false;
  /*const locked = (() => {
    if (!bucket) return true;
    const rank = bucket.rank ?? deriveRank(bucket);
    return rank > limit;
  })();*/

  const buyLegacy = async () => {
    if (!bucket) return;
    setPlacing(true);
    setOrderErr("");
    setResult(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const legs = (bucket.items ?? []).map(i => ({
        exchange: i.exchange ?? "NSE",
        symbol: i.symbol,
        qty: Number(qty),
        product: i.product ?? "CNC",
        priceType: "MARKET",
        limitPrice: null
      }));
      const payload = {
        bucketId: bucket.id,
        legs,
        idempotencyKey: `${bucket.id}-${Date.now()}`
      };
      const res = await fetch(`${API_BASE}/orders/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      setResult(body);
    } catch (e) {
      setOrderErr(String(e));
    } finally {
      setPlacing(false);
    }
  };

  const buildPreview = async () => {
    if (!bucket) return;
    const budget = Number(budgetInr);
    if (!Number.isFinite(budget) || budget <= 0) {
      setPreviewErr("Enter a valid investment amount.");
      return;
    }
    setPreviewLoading(true);
    setPreviewErr("");
    setOrderErr("");
    setPreview(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/model-buckets/${bucket.id}/order-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ budgetInr: budget }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail || "Preview failed");
      setPreview(body);
    } catch (e) {
      setPreviewErr(e.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const buyModel = async () => {
    if (!bucket) return;
    const budget = Number(budgetInr);
    if (!Number.isFinite(budget) || budget <= 0) {
      setOrderErr("Enter a valid investment amount.");
      return;
    }
    setPlacing(true);
    setOrderErr("");
    setResult(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/model-buckets/${bucket.id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ budgetInr: budget }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail || "Buy failed");
      setResult(body);
      if (body?.preview) {
        setPreview(body.preview);
      }
    } catch (e) {
      setOrderErr(e.message || "Buy failed");
    } finally {
      setPlacing(false);
    }
  };

  if (!user) return <p>Please sign in.</p>;
  if (err && !bucket) return <p style={{ color: "tomato" }}>{err}</p>;
  if (!bucket) return <p>Loading…</p>;

  const formatWeight = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatRupee = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return `₹${num.toFixed(2)}`;
  };

  const SERVICE_CHARGE = 20;
  const qtyNumber = Number(qty) || 0;
  const items = bucket.items ?? [];
  const budgetValue = Number(budgetInr);
  const hasValidBudget = Number.isFinite(budgetValue) && budgetValue > 0;
  const connectHref = router?.asPath
    ? `/connect?returnTo=${encodeURIComponent(router.asPath)}`
    : "/connect";
  const canTransact = zerodhaConnected === true && hasValidBudget;
  const canLegacy = zerodhaConnected === true && !locked;

  let subtotal = 0;
  const pricedItems = items.map((i) => {
    // prefer `ltp` from backend, but also accept `price` if you ever add it
    const price =
      typeof i.ltp === "number"
        ? i.ltp
        : typeof i.price === "number"
        ? i.price
        : null;

    let lineTotal = null;
    if (price != null && qtyNumber > 0) {
      lineTotal = price * qtyNumber;
      subtotal += lineTotal;
    }

    return { ...i, price, lineTotal };
  });

  const grandTotal = subtotal > 0 ? subtotal + SERVICE_CHARGE : null;

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* HEADER: icon + title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          marginTop: 16,
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 30% 30%, #f9fafb, #c4c4c4, #9ca3af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.4rem",
            color: "#111827",
          }}
        >
          S
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{bucket.name}</h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.9rem",
              color: "#6b7280",
            }}
          >
            {isModel
              ? (bucket.description || "Model bucket built from a diversified ETF mix for your risk band.")
              : <>Managed by <strong>Growfolio experts</strong> · Thematic exposure to silver via Zerodha Silver ETF (SILVERCASE).</>}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            {Array.isArray(bucket.legs)
              ? bucket.legs
                  .map(
                    (leg) => `${leg.exchange ?? "NSE"}:${leg.symbol ?? ""}`
                  )
                  .join(", ")
              : null}
          </p>
        </div>
      </div>

      {/* MAIN GRID: left content + right price card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr)",
          gap: 32,
        }}
      >
        {/* LEFT SIDE */}
        <div>
          {/* tabs */}
          <div
            style={{
              display: "flex",
              gap: 16,
              borderBottom: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            {["overview", "funds"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "8px 0",
                  marginBottom: -1,
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #2563eb"
                      : "2px solid transparent",
                  fontWeight: activeTab === tab ? 600 : 500,
                  fontSize: "0.95rem",
                  color:
                    activeTab === tab ? "#111827" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {tab === "overview" ? "Overview" : "Funds"}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#4b5563",
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {isModel ? (
                  <>
                    {bucket.description || "Model bucket built from a diversified ETF mix for your risk band."}{" "}
                    Demo defaults only; weights can change as templates evolve.
                  </>
                ) : (
                  <>
                    Silver Exposure 01 is built around{" "}
                    <strong>Zerodha Silver ETF (SILVERCASE)</strong>, giving you a
                    simple, low-ticket way to participate in silver prices without
                    dealing with physical storage or futures. It aims to track the
                    domestic price of physical silver over the long term, making it
                    a convenient satellite allocation alongside your core equity
                    portfolio. Returns are driven by global demand for silver in
                    both industrial use-cases and as a store of value.
                  </>
                )}
              </p>

              {/* time range selector */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#6b7280",
                  }}
                >
                  Demo performance index (base 100)
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {["1M", "1Y", "3Y"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      style={{
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        padding: "4px 10px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        backgroundColor:
                          range === r ? "#2563eb" : "#ffffff",
                        color: range === r ? "#ffffff" : "#4b5563",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <BucketPerformanceChart data={chartData} />

              <p
                style={{
                  marginTop: 8,
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                This chart is for illustration. Once live data is wired, the
                line will reflect the combined performance of the underlying
                instruments in this bucket.
              </p>
            </div>
          )}

          {/* FUNDS TAB */}
          {activeTab === "funds" && (
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>
                Funds in this bucket
              </h2>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#6b7280",
                  marginBottom: 12,
                }}
              >
                {isModel ? (
                  <>
                    Holdings are weighted in the model template. Your quantities are derived from the investment amount.
                  </>
                ) : (
                  <>
                    Silver Exposure 01 currently allocates 100% of its exposure to
                    <strong> Zerodha Silver ETF (SILVERCASE)</strong> split across
                    two legs. You can later diversify by adding more silver-linked
                    instruments or changing the weights.
                  </>
                )}
              </p>
              {isModel ? (
                <table style={{ width: "100%", fontSize: "0.9rem" }}>
                  <thead>
                    <tr>
                      <th align="left">Instrument</th>
                      <th align="right">Weight</th>
                      <th align="right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bucket.items ?? []).map((leg, idx) => (
                      <tr key={idx}>
                        <td>
                          {leg.exchange ?? "NSE"}:{leg.symbol}
                        </td>
                        <td align="right">{formatWeight(leg.weight)}</td>
                        <td align="right">{formatRupee(leg.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: "100%", fontSize: "0.9rem" }}>
                  <thead>
                    <tr>
                      <th align="left">Instrument</th>
                      <th align="right">Default qty</th>
                      <th align="right">Weight (demo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bucket.legs ?? []).map((leg, idx) => (
                      <tr key={idx}>
                        <td>
                          {leg.exchange ?? "NSE"}:{leg.symbol}
                        </td>
                        <td align="right">
                          {leg.defaultQty != null
                            ? leg.defaultQty
                            : "-"}
                        </td>
                        <td align="right">
                          {bucket.legs.length
                            ? `${(100 / bucket.legs.length).toFixed(
                                0
                              )}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: price card */}
        <div>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: 20,
              boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              Invest in this bucket
            </h2>

            {loadingPlanMeta && (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 8 }}>
                Checking Zerodha connection...
              </div>
            )}
            {zerodhaConnected === true && (
              <div style={{ fontSize: "0.8rem", color: "#065f46", marginBottom: 8 }}>
                Zerodha: Connected
                {zerodhaUpdatedAt && (
                  <span style={{ color: "#6b7280" }}>
                    {" "}- Updated {new Date(zerodhaUpdatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {zerodhaConnected === false && (
              <div style={{ fontSize: "0.8rem", color: "#b91c1c", marginBottom: 10 }}>
                <div>Connect Zerodha to fetch live prices and build an order preview.</div>
                <a href={connectHref} style={{ color: "#2563eb", textDecoration: "underline" }}>
                  Connect Zerodha
                </a>
              </div>
            )}

            {/* existing lock message */}
            {/*locked && (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  marginBottom: 12,
                }}
              >
                🔒 This bucket is locked for your plan ({plan || "free"}).{" "}
                <a href="/plans" style={{ textDecoration: "underline" }}>
                  Upgrade
                </a>{" "}
                to access it.
              </div>
            )*/}

            {/* price breakdown */}
            {!isModel && pricedItems.length > 0 && (
              <>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    marginTop: 0,
                    marginBottom: 6,
                  }}
                >
                  Price breakdown
                </h3>
                <table
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    marginBottom: 8,
                  }}
                >
                  <thead>
                    <tr>
                      <th align="left">Stock</th>
                      <th align="right">Shares</th>
                      <th align="right">Price / share</th>
                      <th align="right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricedItems.map((i, idx) => (
                      <tr key={idx}>
                        <td>
                          {`${i.exchange ?? "NSE"}:${i.symbol}`}
                        </td>
                        <td align="right">{qtyNumber || "-"}</td>
                        <td align="right">
                          {i.price != null
                            ? `₹${i.price.toFixed(2)}`
                            : "—"}
                        </td>
                        <td align="right">
                          {i.lineTotal != null
                            ? `₹${i.lineTotal.toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} align="right">
                        Subtotal
                      </td>
                      <td align="right">
                        {subtotal > 0
                          ? `₹${subtotal.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} align="right">
                        Service / transaction charges
                      </td>
                      <td align="right">
                        ₹{SERVICE_CHARGE.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} align="right">
                        <strong>Grand total</strong>
                      </td>
                      <td align="right">
                        {grandTotal != null
                          ? `₹${grandTotal.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* informative note if no prices */}
            {!isModel && pricedItems.every((i) => i.price == null) && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                Live prices unavailable. Once Zerodha live data is enabled,
                this card will show latest prices and totals.
              </p>
            )}

            {isModel && (bucket.items ?? []).every((i) => i.price == null) && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                Live prices unavailable. Connect Zerodha to fetch latest prices.
              </p>
            )}

            {/* quantity + buy button */}
            {isModel ? (
              <div style={{ marginTop: 12 }}>
                <label
                  style={{
                    fontSize: "0.85rem",
                    color: "#4b5563",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Investment amount (₹):
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <input
                    type="number"
                    min={1}
                    value={budgetInr}
                    onChange={(e) => setBudgetInr(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: 160,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                    }}
                  />
                  {Number.isFinite(suggestedBudget) && (
                    <button
                      type="button"
                      onClick={() => setBudgetInr(String(Math.round(suggestedBudget)))}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #d7deea",
                        background: "#fff",
                        fontSize: 12,
                      }}
                    >
                      Use surplus
                    </button>
                  )}
                </div>
                {Number.isFinite(monthlySurplus) && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 8 }}>
                    Monthly surplus: {formatRupee(monthlySurplus)}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn ghost"
                    onClick={buildPreview}
                    disabled={previewLoading || !canTransact}
                  >
                    {previewLoading ? "Building…" : "Build order preview"}
                  </button>
                  <button
                    className="btn"
                    onClick={buyModel}
                    disabled={placing || !canTransact}
                  >
                    {placing ? "Placing…" : "Buy bucket"}
                  </button>
                </div>
                {previewErr && (
                  <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#b91c1c" }}>
                    {previewErr}
                  </div>
                )}
                {orderErr && (
                  <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#b91c1c" }}>
                    {orderErr}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <label
                  style={{
                    fontSize: "0.85rem",
                    color: "#4b5563",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Number of shares per stock:
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 120,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    marginBottom: 8,
                  }}
                  disabled={locked}
                />
                <button
                  className="btn"
                  onClick={buyLegacy}
                  disabled={placing || locked || !canLegacy}
                >
                  {placing ? "Placing…" : "Buy bucket"}
                </button>
                {orderErr && (
                  <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#b91c1c" }}>
                    {orderErr}
                  </div>
                )}
              </div>
            )}

            {isModel && preview && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fafafa" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Order preview</div>
                {preview.holdings && preview.holdings.length > 0 ? (
                  <table style={{ width: "100%", fontSize: "0.85rem", marginBottom: 8 }}>
                    <thead>
                      <tr>
                        <th align="left">Stock</th>
                        <th align="right">Qty</th>
                        <th align="right">Price</th>
                        <th align="right">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.holdings.map((h, idx) => (
                        <tr key={idx}>
                          <td>{`${h.exchange ?? "NSE"}:${h.symbol}`}</td>
                          <td align="right">{h.qty}</td>
                          <td align="right">{formatRupee(h.price)}</td>
                          <td align="right">{formatRupee(h.lineTotal)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} align="right">Subtotal</td>
                        <td align="right">{formatRupee(preview.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} align="right">Leftover</td>
                        <td align="right">{formatRupee(preview.leftover)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    Budget too low to buy any shares. Increase the investment amount and try again.
                  </div>
                )}
                {!!(preview.warnings || []).length && (
                  <ul style={{ margin: "8px 0 0 18px", fontSize: "0.8rem", color: "#6b7280" }}>
                    {preview.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
