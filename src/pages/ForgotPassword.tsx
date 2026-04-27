import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase";
import { Shell } from "@/components/Shell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh", position: "relative" }}>
        {/* Glowing orb background */}
        <div className="breathe" style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0 }}></div>
        
        <div className="card" style={{ maxWidth: 440, width: "100%", zIndex: 1, border: "1px solid rgba(14, 165, 233, 0.3)", boxShadow: "0 0 50px rgba(14, 165, 233, 0.1)", background: "linear-gradient(180deg, rgba(15, 23, 42, 0.85), rgba(248, 250, 252, 0.95))", backdropFilter: "blur(16px)" }}>
          <div className="card-body" style={{ padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div className="breathe" style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: 16, background: "conic-gradient(from 210deg, #bae6fd, #0ea5e9, #0284c7, #bae6fd)", boxShadow: "0 10px 30px rgba(14, 165, 233, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="brand-text-zyntra" style={{ fontSize: 42 }}>Zyntra</span>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #bae6fd, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, letterSpacing: "-0.02em" }}>Reset Password</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Enter your email to receive a reset link.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
            {success && (
              <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", marginBottom: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ margin: "0 0 8px", color: "#10b981", fontSize: 16 }}>Check your inbox!</h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  We've sent a password reset message from Zyntra to your email address.
                </p>
              </div>
            )}
            
            <form className="grid" style={{ gap: 20 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="email" style={{ color: "#bae6fd", opacity: 0.9 }}>Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: "rgba(15, 23, 42, 0.3)", borderColor: "rgba(14, 165, 233, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(161,98,7,0.3))", borderColor: "rgba(14, 165, 233, 0.5)", color: "#bae6fd", fontWeight: 700, padding: "16px", marginTop: "8px", boxShadow: "0 0 20px rgba(14, 165, 233, 0.15)", fontSize: 16 }}>
                {busy ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15 }}>
                Remembered your password? <Link to="/login" style={{ color: "#0ea5e9", textDecoration: "underline", fontWeight: 600 }}>Back to login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
