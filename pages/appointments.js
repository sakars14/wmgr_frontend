import { useRouter } from "next/router";
import styles from "../styles/Landing.module.css";

export default function AppointmentsPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.appointmentsWrap}>
          <h1>Appointments coming soon</h1>
          <p className={styles.cardBody}>
            We are setting up advisor slots for onboarding, planning, and reviews.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => router.push("/")}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
