import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebase";

export function isIgnorableAuthError(err) {
  const code = err?.code || "";
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  );
}

export async function signInWithGooglePopupSafe() {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return { ok: true, credential: cred };
  } catch (err) {
    if (isIgnorableAuthError(err)) {
      return { ok: false, cancelled: true };
    }
    console.error("Google sign-in failed:", err);
    return { ok: false, error: err };
  }
}

export async function signInWithEmailPasswordSafe(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, credential: cred };
  } catch (err) {
    console.error("Email/password sign-in failed:", err);
    return { ok: false, error: err };
  }
}
