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
  const [bucket, setBucket] = useState(null);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
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
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/buckets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        const normalized = {
          ...data,
          id: data.id ?? data.bucketId ?? id,
          name: data.name ?? data.title ?? id,
          items: Array.isArray(data.items) ? data.items : (Array.isArray(data.legs) ? data.legs : []),
        };
        if (alive) setBucket(normalized);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    })();
    return () => { alive = false; };
  }, [user, id]);

  const locked = false;
  /*const locked = (() => {
    if (!bucket) return true;
    const rank = bucket.rank ?? deriveRank(bucket);
    return rank > limit;
  })();*/

  const buy = async () => {
    if (!bucket) return;
    setPlacing(true); setErr(""); setResult(null);
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
      setErr(String(e));
    } finally {
      setPlacing(false);
    }
  };

  if (!user) return <p>Please sign in.</p>;
  if (err && !bucket) return <p style={{ color: "tomato" }}>{err}</p>;
  if (!bucket) return <p>Loading…</p>;

  const SERVICE_CHARGE = 20;
  const qtyNumber = Number(qty) || 0;
  const items = bucket.items ?? [];

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
            Managed by <strong>Growfolio experts</strong> · Thematic exposure to
            silver via Zerodha Silver ETF (SILVERCASE).
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
                Silver Exposure 01 is built around{" "}
                <strong>Zerodha Silver ETF (SILVERCASE)</strong>, giving you a
                simple, low-ticket way to participate in silver prices without
                dealing with physical storage or futures. It aims to track the
                domestic price of physical silver over the long term, making it
                a convenient satellite allocation alongside your core equity
                portfolio. Returns are driven by global demand for silver in
                both industrial use-cases and as a store of value.
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
                Silver Exposure 01 currently allocates 100% of its exposure to
                <strong> Zerodha Silver ETF (SILVERCASE)</strong> split across
                two legs. You can later diversify by adding more silver-linked
                instruments or changing the weights.
              </p>
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
            {pricedItems.length > 0 && (
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
            {pricedItems.every((i) => i.price == null) && (
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

            {/* quantity + buy button */}
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
                onClick={buy}
                disabled={placing || locked}
              >
                {placing ? "Placing…" : "Buy bucket"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}