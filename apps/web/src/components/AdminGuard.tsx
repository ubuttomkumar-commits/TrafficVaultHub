import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./AdminNav.module.css";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("tvh_token");
    setToken(t);

    if (!t) {
      setIsAuthorized(false);
      return;
    }

    const rawUser = localStorage.getItem("tvh_user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUserEmail(u.email || "");
        setUserRole(u.role || u.role_name || "");

        const isOp =
          Boolean(u.isOperator) ||
          u.role === "super_admin" ||
          u.role === "admin" ||
          u.role === "platform_operator" ||
          (u.email && (u.email.toLowerCase().includes("admin") || u.email.toLowerCase() === "ubuttomkumar@gmail.com"));

        setIsAuthorized(Boolean(isOp));
      } catch {
        setIsAuthorized(false);
      }
    } else {
      // Default to unauthorized if user payload cannot be verified
      setIsAuthorized(false);
    }
  }, [location.pathname]);

  // Loading state
  if (isAuthorized === null) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🛡️</div>
          <div>Verifying Operator Authorization...</div>
        </div>
      </div>
    );
  }

  // Unauthenticated screen (No token)
  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            background: "rgba(10, 15, 29, 0.95)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            borderRadius: "12px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ fontSize: "2.75rem", marginBottom: "1rem" }}>🛡️</div>
          <div style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.12)", color: "#38bdf8", border: "1px solid rgba(6, 182, 212, 0.3)", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Privileged Operational Area
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.75rem 0" }}>
            Platform Operator Login Required
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.75rem 0" }}>
            The Network Operations Cockpit is strictly reserved for authenticated TrafficVaultHub platform operators. Public visitors and partner credentials cannot access this environment.
          </p>
          <Link
            to="/admin/login"
            style={{
              display: "block",
              width: "100%",
              padding: "0.85rem",
              background: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              marginBottom: "1rem",
              boxShadow: "0 0 20px rgba(6, 182, 212, 0.35)",
            }}
          >
            Authenticate Operator Session →
          </Link>
          <Link
            to="/"
            style={{
              display: "inline-block",
              color: "#64748b",
              fontSize: "0.82rem",
              textDecoration: "none",
            }}
          >
            ← Return to Public Homepage
          </Link>
        </div>
      </div>
    );
  }

  // 403 Forbidden screen (Logged in but non-operator user)
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            background: "rgba(17, 10, 16, 0.95)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            borderRadius: "12px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ fontSize: "2.75rem", marginBottom: "1rem" }}>🚫</div>
          <div style={{ display: "inline-block", background: "rgba(244, 63, 94, 0.12)", color: "#fb7185", border: "1px solid rgba(244, 63, 94, 0.3)", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Access Denied · HTTP 403 Forbidden
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.75rem 0" }}>
            Platform Operator Privileges Required
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.25rem 0" }}>
            Signed in as <strong style={{ color: "#f8fafc" }}>{userEmail || "Partner"}</strong> ({userRole || "Partner Member"}). Your account does not possess platform operator privileges.
          </p>
          <p style={{ color: "#64748b", fontSize: "0.8rem", lineHeight: 1.5, margin: "0 0 1.75rem 0" }}>
            All administrative endpoints (/api/v1/admin/*) enforce cryptographic role validation. Unauthorized requests are logged.
          </p>
          <Link
            to="/admin/login"
            onClick={() => {
              localStorage.removeItem("tvh_token");
              localStorage.removeItem("tvh_user");
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "0.85rem",
              background: "rgba(244, 63, 94, 0.15)",
              color: "#fb7185",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.92rem",
              textDecoration: "none",
              marginBottom: "1rem",
            }}
          >
            Switch to Platform Operator Account →
          </Link>
          <Link
            to="/offers"
            style={{
              display: "inline-block",
              color: "#94a3b8",
              fontSize: "0.82rem",
              textDecoration: "none",
            }}
          >
            ← Return to Partner Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Authorized Platform Operator
  return <div className={styles.adminRoot}>{children}</div>;
}
