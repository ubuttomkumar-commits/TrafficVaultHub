import { useState, useEffect, useRef, type ReactNode } from "react";
import { apiUrl } from "../../lib/api";
import styles from "./EmailOtpVerification.module.css";

type Props = {
  email: string;
  applicationId?: string;
  onVerified: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: ReactNode;
};

export function EmailOtpVerification({
  email,
  applicationId,
  onVerified,
  onCancel,
  title = "Verify Your Email Address",
  subtitle,
}: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      setCanResend(false);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    // Only accept numeric characters
    const clean = value.replace(/[^0-9]/g, "");
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // Single digit input
    const char = clean.slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    setError(null);

    // Auto-advance
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setError(null);

    const nextIndex = Math.min(5, pasted.length);
    inputsRef.current[nextIndex]?.focus();
  }

  const isComplete = digits.every((d) => d.length === 1);
  const code = digits.join("");

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isComplete || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Send to verify-email-otp endpoint
      const res = await fetch(apiUrl("/api/v1/auth/verify-email-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          applicationId,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Verification failed (${res.status})`);
      }

      setSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);
    setDevHint(null);

    try {
      const res = await fetch(apiUrl("/api/v1/auth/resend-email-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, applicationId }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? "Failed to resend code");
      }
      setCountdown(60);
      setCanResend(false);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      if (body?.data?.devCodeHint) {
        setDevHint(`Dev Server Code: ${body.data.devCodeHint}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend verification code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.icon}>✉️</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>
        {subtitle ?? (
          <>
            We sent a secure 6-digit confirmation code to:
            <br />
            <span className={styles.emailHighlight}>{email}</span>
          </>
        )}
      </p>

      {error && <div className={styles.errorBox}>⚠️ {error}</div>}

      {success ? (
        <div className={styles.successBox}>
          <strong>✓ Email Verified Successfully!</strong>
          <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Advancing to your compliance review docket...
          </div>
        </div>
      ) : (
        <form onSubmit={handleVerify}>
          <div className={styles.inputsContainer} onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={loading}
                className={styles.otpInput}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!isComplete || loading}
            className={styles.btnPrimary}
          >
            {loading ? "Verifying Token..." : "Confirm & Continue →"}
          </button>
        </form>
      )}

      {devHint && <div className={styles.devHint}>ℹ️ {devHint}</div>}

      <div className={styles.resendRow}>
        <span>Didn't receive the email?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || resending}
          className={styles.resendBtn}
        >
          {resending
            ? "Sending..."
            : canResend
            ? "Resend Code"
            : `Resend in ${countdown}s`}
        </button>
      </div>

      {onCancel && (
        <div style={{ marginTop: "1rem" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
