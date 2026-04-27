import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import type { Betslip, Purchase } from "@/types";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { useCountdown } from "@/hooks/useCountdown";
import { resultSymbol } from "@/lib/stats";
import { apiUrl } from "@/lib/apiBase";

function BigCountdown({ expiresAt }: { expiresAt: number }) {
  const cd = useCountdown(expiresAt);
  if (cd.expired) {
    return <div className="alert">This betslip has expired.</div>;
  }
  let color = "#fde047";
  let bg = "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(234, 179, 8, 0.05))";
  let border = "rgba(14, 165, 233, 0.5)";
  let shadow = "0 0 12px rgba(14, 165, 233, 0.4)";
  
  if (cd.days === 0) {
    if (cd.hours === 0 && cd.minutes < 15) {
      color = "#fecdd3";
      bg = "linear-gradient(135deg, rgba(225, 29, 72, 0.5), rgba(225, 29, 72, 0.2))";
      border = "rgba(225, 29, 72, 0.8)";
      shadow = "0 0 16px rgba(225, 29, 72, 0.6)";
    } else if (cd.hours < 2) {
      color = "#ffe4e6";
      bg = "linear-gradient(135deg, rgba(244, 63, 94, 0.3), rgba(244, 63, 94, 0.1))";
      border = "rgba(244, 63, 94, 0.5)";
      shadow = "0 0 12px rgba(244, 63, 94, 0.3)";
    }
  }

  const boxStyle = { color, background: bg, borderColor: border, boxShadow: shadow, fontWeight: 800, transition: "all 1s ease", textShadow: "0 1px 4px rgba(15, 23, 42, 0.8)" };

  return (
    <div className="countdown" aria-live="polite">
      <div className="cd-box" style={boxStyle}>
        <div className="cd-num">{cd.days}</div>
        <div className="cd-lbl">Days</div>
      </div>
      <div className="cd-box" style={boxStyle}>
        <div className="cd-num">{String(cd.hours).padStart(2, "0")}</div>
        <div className="cd-lbl">Hours</div>
      </div>
      <div className="cd-box" style={boxStyle}>
        <div className="cd-num">{String(cd.minutes).padStart(2, "0")}</div>
        <div className="cd-lbl">Minutes</div>
      </div>
      <div className="cd-box" style={boxStyle}>
        <div className="cd-num">{String(cd.seconds).padStart(2, "0")}</div>
        <div className="cd-lbl">Seconds</div>
      </div>
    </div>
  );
}

export default function BetslipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slip, setSlip] = useState<Betslip | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  useEffect(() => {
    if (!id) return;
    const r = ref(db, `betslips/${id}`);
    return onValue(
      r,
      (snap) => {
        setSlip(snap.exists() ? (snap.val() as Betslip) : null);
        setLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );
  }, [id]);

  useEffect(() => {
    if (!id || !user) {
      setPurchase(null);
      return;
    }
    const r = ref(db, `purchases/${user.uid}/${id}`);
    return onValue(r, (snap) => setPurchase(snap.exists() ? (snap.val() as Purchase) : null));
  }, [id, user]);

  useEffect(() => {
    if (!id || !user || purchase?.status !== "completed") {
      setCode(null);
      return;
    }
    const r = ref(db, `betslipCodes/${id}`);
    return onValue(
      r,
      (snap) => {
        const v = snap.val() as { code?: string } | null;
        setCode(v?.code ?? null);
      },
      () => setCode(null)
    );
  }, [id, user, purchase?.status]);

  useEffect(() => {
    if (!user) return;
    const dn = user.displayName?.trim();
    if (dn && dn.split(/\s+/).length >= 2) setBuyerName(dn);
    if (user.email) setBuyerEmail(user.email);
  }, [user]);

  const expired = useMemo(() => {
    if (!slip) return true;
    return Date.now() > Number(slip.expiresAt);
  }, [slip]);

  const unlocked = purchase?.status === "completed";

  async function startPayment() {
    if (!id || !user) return;
    setPayBusy(true);
    setPayError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(apiUrl("/api/checkout/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          betslipId: id,
          buyer: { name: buyerName, email: buyerEmail, phone: buyerPhone },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Payment could not be started.");
      }
      sessionStorage.setItem("checkoutOrderId", String(data.orderId));
      sessionStorage.setItem("checkoutBetslipId", id);
      navigate("/payment/return");
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "Payment could not be started.");
    } finally {
      setPayBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(15, 23, 42, 0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        </div>
      </Shell>
    );
  }

  if (!id) {
    return (
      <Shell>
        <div className="alert">Missing betslip id.</div>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <div className="alert">{loadError}</div>
      </Shell>
    );
  }

  if (!slip) {
    return (
      <Shell>
        <div className="alert">This betslip is not available.</div>
        <p className="muted">
          It may have been removed or never existed. <Link to="/">Back to browse</Link>
        </p>
      </Shell>
    );
  }

  if (expired && !unlocked) {
    return (
      <Shell>
        <div className="alert">This betslip has expired and is no longer available for purchase.</div>
        <Link className="btn btn-ghost" to="/">
          Back
        </Link>
      </Shell>
    );
  }

  const outcome = resultSymbol(slip.result);

  return (
    <Shell>
      <div className="row" style={{ marginTop: 10, marginBottom: 10 }}>
        <Link className="btn btn-ghost" to="/">
          ← All betslips
        </Link>
        <span className="pill">
          {slip.company} · {slip.cost} {slip.currency}
        </span>
      </div>

      <div className="split">
        <div className="card">
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img className={`thumb ${unlocked ? "breathe" : ""}`} src={slip.imageUrl} alt="" style={{ filter: unlocked ? "none" : "blur(14px) brightness(0.6)", transform: unlocked ? "none" : "scale(1.1)", transition: "all 0.5s ease" }} />
            {!unlocked && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "rgba(248, 250, 252, 0.3)" }}>
                <span className="breathe" style={{ fontSize: 42, filter: "drop-shadow(0 2px 8px rgba(15, 23, 42, 0.8))", display: "inline-block" }}>🔒</span>
                <span className="breathe" style={{ fontWeight: 700, marginTop: 12, color: "#0f172a", textShadow: "0 2px 8px rgba(15, 23, 42, 0.8)", letterSpacing: "0.05em", fontSize: 18, display: "inline-block" }}>LOCKED</span>
              </div>
            )}
          </div>
          <div className="card-body">
            <h1 style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: "-0.02em" }}>{slip.title}</h1>
            <p className="muted" style={{ marginTop: 0 }}>
              Expires at {new Date(Number(slip.expiresAt)).toLocaleString()}
            </p>
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Time left
              </div>
              <BigCountdown expiresAt={Number(slip.expiresAt)} />
            </div>
            <div style={{ marginTop: 16 }} className="row">
              <span className="badge">
                Result: <strong>{slip.result === "pending" ? "Pending" : outcome}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 14 }}>
          {!user && (
            <div className="card">
              <div className="card-body">
                <div className="alert info">Log in to purchase and unlock this betslip.</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn" to="/login">
                    Log in
                  </Link>
                  <Link className="btn btn-ghost" to="/register">
                    Register
                  </Link>
                </div>
              </div>
            </div>
          )}

          {user && !unlocked && (
            <div className="card">
              <div className="card-body">
                <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Pay with PalmPesa</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  A payment prompt will be sent to your phone. Approve the transaction to unlock your code.
                </p>
                {payError && <div className="alert" style={{ marginTop: 12 }}>{payError}</div>}
                <div className="grid" style={{ gap: 12, marginTop: 12 }}>
                  <div className="field">
                    <label htmlFor="bn">Full name (two words minimum)</label>
                    <input id="bn" className="input" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="be">Email</label>
                    <input id="be" className="input" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="bp">Phone (MSISDN, e.g. 2557…)</label>
                    <input id="bp" className="input" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                  </div>
                  <button className="btn" type="button" disabled={payBusy} onClick={() => void startPayment()}>
                    {payBusy ? "Starting…" : `Pay ${slip.cost} ${slip.currency}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {user && unlocked && (
            <div className="card">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Your unlocked betslip</h2>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      Copy the booking code below. Keep it private.
                    </p>
                  </div>
                  {copyStatus && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, animation: "slideDown 0.3s ease" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Copied Successfully
                    </div>
                  )}
                </div>
                <div
                  className="mono"
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(248, 250, 252, 0.55)",
                    wordBreak: "break-word",
                  }}
                >
                  {code ?? "Loading code…"}
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={!code}
                    onClick={() => {
                      if (code) handleCopy(code, 'code');
                    }}
                  >
                    Copy code
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={!code}
                    onClick={() => {
                      if (code) handleCopy(`${slip.title}\n${code}`, 'titleCode');
                    }}
                  >
                    Copy title + code
                  </button>
                </div>
              </div>
              <style>{`
                @keyframes slideDown {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
