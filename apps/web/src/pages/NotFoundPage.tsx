import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Page not found</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        The route you requested does not exist.
      </p>
      <Link to="/">Return home</Link>
    </div>
  );
}
