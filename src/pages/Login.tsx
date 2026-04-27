import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { Shell } from "@/components/Shell";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="brand-text-zyntra" style={{ fontSize: 42 }}>Zyntra</span>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #bae6fd, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, letterSpacing: "-0.02em" }}>Welcome Back</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Sign in to access your premium picks.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
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
              <div className="field">
                <label htmlFor="password" style={{ color: "#bae6fd", opacity: 0.9 }}>Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: "rgba(15, 23, 42, 0.3)", borderColor: "rgba(14, 165, 233, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(161,98,7,0.3))", borderColor: "rgba(14, 165, 233, 0.5)", color: "#bae6fd", fontWeight: 700, padding: "16px", marginTop: "8px", boxShadow: "0 0 20px rgba(14, 165, 233, 0.15)", fontSize: 16 }}>
                {busy ? "Authenticating…" : "Sign In Securely"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15, marginBottom: 8 }}>
                <Link to="/forgot-password" style={{ color: "rgba(14, 165, 233, 0.8)", textDecoration: "underline" }}>Forgot your password?</Link>
              </p>
              <p className="muted" style={{ fontSize: 15, margin: 0 }}>
                New here? <Link to="/register" style={{ color: "#0ea5e9", textDecoration: "underline", fontWeight: 600 }}>Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
