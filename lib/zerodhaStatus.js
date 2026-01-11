export async function fetchZerodhaStatus(apiBase, token) {
  if (!apiBase || !token) {
    return { connected: false, updatedAt: null };
  }
  const res = await fetch(`${apiBase}/auth/zerodha/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`status ${res.status}`);
  }
  const data = await res.json();
  return {
    connected: Boolean(data?.connected),
    updatedAt: data?.updatedAt || data?.connectedAt || null,
  };
}
