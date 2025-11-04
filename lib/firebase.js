
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};
export const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export async function signInGoogle(){ await signInWithPopup(auth, provider); }
export async function signOutUser(){ await signOut(auth); }
export async function getIdToken(force=false){ const u=auth.currentUser; if(!u) throw new Error('Not signed in'); return u.getIdToken(force); }
