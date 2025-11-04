// lib/usePlan.js
import { useEffect, useState, useCallback } from "react";
import { auth } from "./firebase";
import { onIdTokenChanged } from "firebase/auth";

export function usePlan(user) {
  const [plan, setPlan] = useState("none");

  const read = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) { setPlan("none"); return; }
    const idt = await u.getIdTokenResult();
    setPlan(idt.claims?.plan || "none");
  }, []);

  // read on mount / user change
  useEffect(() => { read(); }, [read, user?.uid]);

  // re-read whenever Firebase refreshes the ID token
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async () => { await read(); });
    const onCustom = () => read();               // manual ping from UI after admin change
    window.addEventListener("claims-changed", onCustom);
    return () => {
      unsub();
      window.removeEventListener("claims-changed", onCustom);
    };
  }, [read]);

  return { plan, refreshPlan: read };
}