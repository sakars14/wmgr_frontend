
import { getIdToken } from './firebase';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
export async function authedFetch(path, options={}){
  const token = await getIdToken(true);
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json', ...(options.headers||{}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if(!res.ok){ throw new Error(`API ${res.status}: ${await res.text()}`); }
  return res.json();
}
