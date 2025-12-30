// pages/connect.js
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";

export default function Connect() {
  const router = useRouter();
  const [msg, setMsg] = useState("Preparing Zerodha login…");
  const [loginUrl, setLoginUrl] = useState("");

  const start = useCallback(async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) {
        setMsg("Missing NEXT_PUBLIC_API_BASE_URL on the frontend.");
        return;
      }

      const u = auth.currentUser;
      if (!u) {
        setMsg("Please sign in first, then click Retry.");
        return;
      }

      const token = await u.getIdToken();
      const returnTo =
        typeof router.query.returnTo === "string" ? router.query.returnTo : "";
      const loginEndpoint = returnTo
        ? `${base}/auth/zerodha/login?returnTo=${encodeURIComponent(returnTo)}`
        : `${base}/auth/zerodha/login`;

      const res = await fetch(loginEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setMsg(`Failed to fetch login URL. HTTP ${res.status} ${text}`);
        return;
      }

      const data = await res.json();
      if (data.loginUrl) {
        setLoginUrl(data.loginUrl);
        // Use replace() so user doesn’t “back” into this page after auth
        window.location.replace(data.loginUrl);
      } else {
        setMsg(`Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      setMsg(`Error: ${e}`);
    }
  }, [router.query.returnTo]);

  useEffect(() => {
    if (!router.isReady) return;
    // Kick off automatically
    start();
  }, [start, router.isReady]);

  return (
    <div className="container">
      <h1>Connect Zerodha</h1>
      <p>{msg}</p>

      {/* Fallback if popup blockers or anything stops auto-redirect */}
      {loginUrl && (
        <p>
          If you weren’t redirected automatically,&nbsp;
          <a className="btn" href={loginUrl}>Open Zerodha Login</a>
        </p>
      )}

      {/* Manual retry if user logged in after page load */}
      {!loginUrl && (
        <p>
          <button className="btn" onClick={start}>Retry</button>
        </p>
      )}
    </div>
  );
}