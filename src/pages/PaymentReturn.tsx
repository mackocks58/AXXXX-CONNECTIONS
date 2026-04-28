import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/apiBase";

type Phase = "wait" | "missing" | "failed" | "success" | "expired";

export default function PaymentReturn() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("wait");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const guestPhone = localStorage.getItem("guestPhone");

  useEffect(() => {
    const orderId = sessionStorage.getItem("checkoutOrderId");
    const betslipId = sessionStorage.getItem("checkoutBetslipId");
    
    // We allow users or guests with a saved phone number
    if (!user && !guestPhone) {
      setPhase("missing");
      return;
    }

    if (!orderId) {
      setPhase("missing");
      return;
    }

    let unsub = () => {};

    // If logged in, we can use fast Firebase Realtime updates
    if (user) {
      const r = ref(db, `userPayments/${user.uid}/${orderId}`);
      unsub = onValue(r, (snap) => {
        if (!snap.exists()) return;
        const v = snap.val() as { status?: string } | null;
        const s = String(v?.status ?? "pending").toLowerCase();
        if (s === "completed") {
          setPhase("success");
          setTimeout(() => {
            sessionStorage.removeItem("checkoutOrderId");
            sessionStorage.removeItem("checkoutBetslipId");
            if (betslipId) nav(`/slip/${betslipId}`, { replace: true });
            else nav("/", { replace: true });
          }, 1500);
        } else if (s === "failed") {
          setPhase("failed");
        }
      });
    }

    // Polling is used for guests (since they can't read Firebase), and as a fallback for users
    const pollStatus = async () => {
      try {
        const res = await fetch(apiUrl(`/api/checkout/status/${orderId}`));
        const data = await res.json();
        if (data.status === "completed") {
          setPhase("success");
          setTimeout(() => {
            sessionStorage.removeItem("checkoutOrderId");
            sessionStorage.removeItem("checkoutBetslipId");
            if (betslipId) nav(`/slip/${betslipId}`, { replace: true });
            else nav("/", { replace: true });
          }, 1500);
        } else if (data.status === "failed") {
          setPhase("failed");
        }
      } catch (e) {}
    };

    const interval = setInterval(pollStatus, 4000); // Poll every 4 seconds

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(interval);
          handleExpiration(orderId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, guestPhone, nav]);

  const handleExpiration = async (orderId: string) => {
    setPhase("expired");
    try {
      await fetch(apiUrl(`/api/checkout/cancel/${orderId}`), { method: "POST" });
    } catch (e) {
      console.error("Failed to cancel", e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Center wrapper style
  const wrapperStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "75vh",
    padding: "20px"
  };

  return (
    <Shell>
      <div style={wrapperStyle}>
        {(!user && !guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff", border: "none", borderRadius: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div className="card-body" style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
              <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900 }}>Authentication Required</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>Please log in to verify your payment.</p>
              <Link className="btn" to="/login" style={{ width: "100%", padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 800, background: "#0ea5e9", color: "#fff", border: "none" }}>
                Log In Now
              </Link>
            </div>
          </div>
        )}

        {phase === "wait" && (user || guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "linear-gradient(135deg, #f8fafc, #ffffff)", border: "1px solid var(--stroke)", borderRadius: 24, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)" }}>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 24px" }}>
              
              <div style={{ position: "relative", width: 80, height: 80, marginBottom: 24 }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  border: "4px solid rgba(14, 165, 233, 0.15)",
                  borderTopColor: "#0ea5e9",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#0ea5e9", fontSize: 28
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                </div>
              </div>

              <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>Approve Payment</h2>
              <p style={{ margin: "0 0 24px", color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
                A secure USSD prompt has been sent to your phone. Enter your PIN to complete the transaction.
              </p>
              
              <div style={{ 
                background: timeLeft < 60 ? "rgba(239, 68, 68, 0.1)" : "rgba(14, 165, 233, 0.08)", 
                padding: "20px", 
                borderRadius: 16, 
                width: "100%",
                border: `1px solid ${timeLeft < 60 ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.2)"}`,
                marginBottom: 24
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: timeLeft < 60 ? "#ef4444" : "#0ea5e9", marginBottom: 8 }}>
                  Time Remaining
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, fontFamily: "monospace", color: timeLeft < 60 ? "#ef4444" : "#0f172a", lineHeight: 1 }}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                Please do not close this page.
              </p>
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {phase === "success" && (user || guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: 24, boxShadow: "0 20px 40px rgba(16, 185, 129, 0.3)" }}>
            <div className="card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ 
                width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", 
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px"
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900 }}>Payment Successful!</h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Redirecting you automatically...</p>
            </div>
          </div>
        )}

        {phase === "failed" && (user || guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", borderRadius: 24, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)" }}>
            <div className="card-body" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", 
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900 }}>Payment Failed</h2>
              <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>The transaction was declined or cancelled.</p>
              <div style={{ display: "flex", gap: 12 }}>
                <Link className="btn" to="/" style={{ flex: 1, padding: 12, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, textAlign: "center" }}>
                  Home
                </Link>
                {user && (
                  <Link className="btn" to="/payments" style={{ flex: 1, padding: 12, background: "#fff", color: "#dc2626", border: "none", borderRadius: 12, fontWeight: 800, textAlign: "center" }}>
                    History
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "expired" && (user || guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", borderRadius: 24, boxShadow: "0 20px 40px rgba(245, 158, 11, 0.3)" }}>
            <div className="card-body" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900 }}>Time Expired</h2>
              <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.9)", fontWeight: 600, lineHeight: 1.4 }}>
                The payment window has closed and the transaction was automatically cancelled.
              </p>
              <Link className="btn" to="/" style={{ width: "100%", padding: 14, background: "#fff", color: "#d97706", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, textAlign: "center", display: "block" }}>
                Return Home
              </Link>
            </div>
          </div>
        )}

        {phase === "missing" && (user || guestPhone) && (
          <div className="card" style={{ maxWidth: 400, width: "100%", background: "#fff", border: "1px solid var(--stroke)", borderRadius: 24 }}>
            <div className="card-body" style={{ textAlign: "center", padding: 32 }}>
              <div className="alert info" style={{ borderRadius: 12, fontWeight: 600, marginBottom: 20 }}>No active checkout session found.</div>
              <Link className="btn" to="/" style={{ width: "100%", padding: 12, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800 }}>
                Browse Movies
              </Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
