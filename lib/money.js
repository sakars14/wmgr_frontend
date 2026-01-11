const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function parseINR(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatINR(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : parseINR(value);
  if (!Number.isFinite(num)) return "";
  return INR_FORMATTER.format(num);
}
