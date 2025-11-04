// lib/useAdmin.js
import { useEffect, useState } from "react";
import { auth } from "./firebase";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

export function useAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { if (alive) setIsAdmin(false); return; }
      try {
        const tok = await auth.currentUser.getIdTokenResult(true); // fresh claims
        const claimAdmin = !!tok.claims?.admin;
        const emailAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;
        if (alive) setIsAdmin(claimAdmin || emailAdmin);
      } catch {
        if (alive) setIsAdmin(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  return isAdmin;
}