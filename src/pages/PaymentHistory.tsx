import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import type { UserPayment } from "@/types";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  
  if (s === "completed" || s === "success" || s === "paid") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        COMPLETED
      </div>
    );
  }
  
  if (s === "failed" || s === "error" || s === "expired" || s === "cancelled") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        FAILED
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      PENDING
    </div>
  );
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, UserPayment> | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<(UserPayment & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRows(null);
      setLoading(false);
      return;
    }
    const r = ref(db, `userPayments/${user.uid}`);
    return onValue(r, (snap) => {
      setRows(snap.val() as Record<string, UserPayment> | null);
      setLoading(false);
    });
  }, [user]);

  const list = useMemo(() => {
    if (!rows) return [];
    return Object.entries(rows)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [rows]);

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(15, 23, 42, 0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Payment History</h1>
      </div>

      {!user && (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div className="alert info">Log in to see your payment history.</div>
            <Link className="btn" to="/login" style={{ marginTop: 15 }}>Log in</Link>
          </div>
        </div>
      )}

      {user && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedPayment(p)}
                      style={{ cursor: "pointer", transition: "background 0.2s" }}
                      className="hover-row"
                    >
                      <td style={{ fontWeight: 500 }}>{new Date(Number(p.createdAt)).toLocaleString()}</td>
                      <td><StatusBadge status={String(p.status)} /></td>
                      <td style={{ fontWeight: 700 }}>
                        {p.amount} {p.currency}
                      </td>
                      <td className="mono" style={{ fontSize: 13, color: "rgba(15, 23, 42, 0.6)" }}>
                        {p.reference || p.palmpesaTransid || p.selcomTransid || p.orderId || p.id}
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={4} className="muted" style={{ textAlign: "center", padding: "40px 20px" }}>
                        You haven't made any payments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <style>{`
            .hover-row:hover td {
              background: rgba(15, 23, 42, 0.05);
            }
          `}</style>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedPayment && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20
        }} onClick={() => setSelectedPayment(null)}>
          <div 
            className="card" 
            style={{ 
              width: "100%", maxWidth: 450, maxHeight: "90vh", overflowY: "auto",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-body" style={{ padding: "30px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Transaction Details</h2>
                <button 
                  onClick={() => setSelectedPayment(null)}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div style={{ textAlign: "center", marginBottom: 30, padding: "20px 0", background: "rgba(15, 23, 42, 0.03)", borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Amount</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#0f172a" }}>
                  {selectedPayment.amount} <span style={{ fontSize: 20, color: "#64748b" }}>{selectedPayment.currency}</span>
                </div>
                <div style={{ marginTop: 15 }}>
                  <StatusBadge status={String(selectedPayment.status)} />
                </div>
              </div>

              <div className="grid" style={{ gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(15, 23, 42, 0.1)", paddingBottom: 12 }}>
                  <span style={{ color: "#64748b" }}>Date & Time</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{new Date(Number(selectedPayment.createdAt)).toLocaleString()}</span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(15, 23, 42, 0.1)", paddingBottom: 12 }}>
                  <span style={{ color: "#64748b" }}>Order ID</span>
                  <span className="mono" style={{ fontSize: 13, textAlign: "right" }}>{selectedPayment.orderId || selectedPayment.id}</span>
                </div>
                
                {(selectedPayment.reference || selectedPayment.palmpesaTransid || selectedPayment.selcomTransid) && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(15, 23, 42, 0.1)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>Gateway Reference</span>
                    <span className="mono" style={{ fontSize: 13, textAlign: "right" }}>
                      {selectedPayment.reference || selectedPayment.palmpesaTransid || selectedPayment.selcomTransid}
                    </span>
                  </div>
                )}
                
                {(selectedPayment.payment_status) && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(15, 23, 42, 0.1)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>Gateway Status</span>
                    <span className="mono" style={{ fontSize: 13, textAlign: "right" }}>{selectedPayment.payment_status}</span>
                  </div>
                )}
              </div>

              <button 
                className="btn" 
                style={{ width: "100%", marginTop: 30 }}
                onClick={() => setSelectedPayment(null)}
              >
                Close
              </button>
            </div>
            <style>{`
              @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
          </div>
        </div>
      )}
    </Shell>
  );
}
