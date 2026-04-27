import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/firebase";
import { Shell } from "@/components/Shell";

export default function Register() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.get("ref") || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const parts = name.trim().split(/\s+/);
      const displayName = parts.length >= 2 ? name.trim() : `${name.trim()} User`;
      await updateProfile(cred.user, { displayName });
      
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await set(ref(db, `users/${cred.user.uid}`), {
        displayName,
        email: email.trim(),
        affiliateCode: newCode,
        referredBy: referralCode.trim() || null,
        createdAt: Date.now()
      });

      if (referralCode.trim()) {
        await set(ref(db, `referrals/${referralCode.trim()}/${cred.user.uid}`), {
          displayName,
          createdAt: Date.now()
        });
      }

      nav("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not register.");
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="brand-text-zyntra" style={{ fontSize: 42 }}>Zyntra</span>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #bae6fd, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, letterSpacing: "-0.02em" }}>Create Account</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Join us to get the best premium picks.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
            <form className="grid" style={{ gap: 20 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="name" style={{ color: "#bae6fd", opacity: 0.9 }}>Full Name</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  style={{ background: "rgba(15, 23, 42, 0.3)", borderColor: "rgba(14, 165, 233, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="email" style={{ color: "#bae6fd", opacity: 0.9 }}>Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  style={{ background: "rgba(15, 23, 42, 0.3)", borderColor: "rgba(14, 165, 233, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="referralCode" style={{ color: "#bae6fd", opacity: 0.9 }}>Referral Code <span style={{opacity:0.5, fontSize:11}}>(Optional)</span></label>
                <input
                  id="referralCode"
                  className="input mono"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  style={{ background: "rgba(15, 23, 42, 0.3)", borderColor: "rgba(14, 165, 233, 0.2)", padding: "14px 16px", textTransform: "uppercase" }}
                />
              </div>
              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(161,98,7,0.3))", borderColor: "rgba(14, 165, 233, 0.5)", color: "#bae6fd", fontWeight: 700, padding: "16px", marginTop: "8px", boxShadow: "0 0 20px rgba(14, 165, 233, 0.15)", fontSize: 16 }}>
                {busy ? "Creating…" : "Create Account Securely"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15 }}>
                Already have an account? <Link to="/login" style={{ color: "#0ea5e9", textDecoration: "underline", fontWeight: 600 }}>Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
