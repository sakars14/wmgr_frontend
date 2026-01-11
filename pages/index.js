import Head from "next/head";
import { useRouter } from "next/router";
import BusinessSummaryGrid from "../components/BusinessSummaryGrid";
import styles from "../styles/Landing.module.css";

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className={styles.page}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <title>growFOLIO</title>
      </Head>

      <div className={styles.shell}>
        <div className={styles.landingMain}>
          <div className="mx-auto max-w-6xl px-6">
            <BusinessSummaryGrid
              onLogin={handleLogin}
              onAppointments={() => router.push("/appointments")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
