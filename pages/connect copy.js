// pages/connect.js
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

export default function Connect() {
  const [msg, setMsg] = useState("Preparing Zerodha login…");

  useEffect(() => {
    async function go() {
      try {
        const u = auth.currentUser;
        if (!u) { setMsg("Please sign in first."); return; }
        const token = await u.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/zerodha/login`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.loginUrl) {
          window.location.href = data.loginUrl; // to Kite Connect
        } else {
          setMsg(`Failed: ${JSON.stringify(data)}`);
        }
      } catch (e) {
        setMsg(`Error: ${e}`);
      }
    }
    go();
  }, []);

  return <p>{msg}</p>;
}