// pages/_app.js
import '../styles.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInGoogle, signOutUser } from '../lib/firebase';
import NavBar from '../components/NavBar';

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const showNav = router.pathname !== "/";

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false);
  }), []);

  return (
    <div className={showNav ? "container" : ""}>
      {showNav && (
        <NavBar user={user} onSignIn={signInGoogle} onSignOut={signOutUser} />
      )}
      <main>
        <Component {...pageProps} user={user} loading={loading} />
      </main>
    </div>
  );
}
