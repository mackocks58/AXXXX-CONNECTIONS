import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

type Phase = "wait" | "missing" | "failed" | "success";

export default function PaymentReturn() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("wait");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown

  useEffect(() => {
    if (!user) return;
    const orderId = sessionStorage.getItem("checkoutOrderId");
    const betslipId = sessionStorage.getItem("checkoutBetslipId");
    if (!orderId) {
      setPhase("missing");
      return;
    }

    const r = ref(db, `userPayments/${user.uid}/${orderId}`);
    const unsub = onValue(r, (snap) => {
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

    const interval = setInterval(async () => {
      try {
        const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
        await fetch(`${base}/api/checkout/status/${orderId}`);
      } catch (e) {
        // ignore network errors in polling
      }
    }, 15000);

    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [user, nav]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Shell>
      <h1 className="page-title" style={{ textAlign: "center" }}>Payment Status</h1>
      
      {!user && (
        <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="card-body" style={{ textAlign: "center" }}>
            <div className="alert">Please log in to verify your payment.</div>
            <Link className="btn" to="/login" style={{ marginTop: 15 }}>
              Log in
            </Link>
          </div>
        </div>
      )}

      {user && phase === "wait" && (
        <div className="card" style={{ maxWidth: 500, margin: "0 auto", padding: "20px 0" }}>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            
            <div style={{ position: "relative", width: 100, height: 100, marginBottom: 20 }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                border: "4px solid rgba(16, 185, 129, 0.2)",
                borderTopColor: "#10b981",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#10b981", fontSize: "32px"
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
            </div>

            <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>Processing Payment...</h2>
            <div className="alert info" style={{ marginBottom: 20, width: "100%" }}>
              A payment prompt has been sent to your phone. Please approve it to unlock your code.
            </div>
            
            <div style={{ 
              background: "rgba(248, 250, 252, 0.4)", 
              padding: "15px 30px", 
              borderRadius: 12, 
              border: "1px solid rgba(15, 23, 42, 0.05)",
              marginBottom: 20
            }}>
              <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Time Remaining</div>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: timeLeft < 60 ? "#ef4444" : "#334155" }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <p className="muted" style={{ fontSize: 14 }}>
              Do not close this page. It will update automatically once completed.
            </p>

            <div className="row" style={{ marginTop: 20, width: "100%", justifyContent: "center", gap: 10 }}>
              <Link className="btn btn-ghost" to="/payments">
                Payment history
              </Link>
            </div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {user && phase === "success" && (
        <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="card-body" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
              color: "#10b981"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 24, color: "#10b981" }}>Payment Successful!</h2>
            <p className="muted">Redirecting to your unlocked betslip...</p>
          </div>
        </div>
      )}

      {user && phase === "failed" && (
        <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px",
              color: "#ef4444"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>Payment Failed</h2>
            <div className="alert">The payment was reported as failed or cancelled.</div>
            <div className="row" style={{ marginTop: 20, justifyContent: "center" }}>
              <Link className="btn btn-ghost" to="/">
                Browse
              </Link>
              <Link className="btn" to="/payments">
                Payment history
              </Link>
            </div>
          </div>
        </div>
      )}

      {user && phase === "missing" && (
        <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="card-body" style={{ textAlign: "center" }}>
            <div className="alert info">No active checkout session was found for this browser tab.</div>
            <Link className="btn" to="/" style={{ marginTop: 15 }}>
              Browse betslips
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}
