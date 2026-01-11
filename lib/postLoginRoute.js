import { doc, getDoc } from "firebase/firestore";

/**
 * Returns the correct route after login:
 * - if client profile exists -> /profile
 * - else -> /onboarding
 *
 * IMPORTANT: keep the Firestore path in sync with the Profile page.
 */
export async function getPostLoginRoute(db, uid) {
  if (!db || !uid) return "/profile";

  let snap;

  if (db && typeof db.collection === "function") {
    snap = await db.collection("clientProfiles").doc(uid).get();
  } else {
    const ref = doc(db, "clientProfiles", uid);
    snap = await getDoc(ref);
  }

  const exists = typeof snap?.exists === "function" ? snap.exists() : !!snap?.exists;
  return exists ? "/profile" : "/onboarding";
}
