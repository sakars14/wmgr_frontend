import { useEffect, useRef } from "react";
import styles from "../styles/ConfirmModal.module.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (onCancel) onCancel();
      }
    };
    document.addEventListener("keydown", handleKey);
    if (cancelRef.current) {
      cancelRef.current.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <h3 className={styles.title}>{title}</h3>
        {message ? <p className={styles.message}>{message}</p> : null}
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
