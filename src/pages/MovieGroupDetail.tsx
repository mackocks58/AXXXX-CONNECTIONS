import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/apiBase";
import type { Movie, MovieGroup, Purchase } from "@/types";


const DEFAULT_GROUPS: Record<string, MovieGroup> = {
  "connection-bongo": { id: "connection-bongo", name: "Connection Za Bongo", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000", amount: 1000, currency: "TZS", description: "The most trending bongo connections and dramas.", createdAt: 1713744000000 },
  "bongo-wiki-hii": { id: "bongo-wiki-hii", name: "Bongo Wiki Hii", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000", amount: 500, currency: "TZS", description: "New Tanzanian movies released this week.", createdAt: 1713744000000 },
  "action-movies": { id: "action-movies", name: "Action Movies", thumbnail: "https://images.unsplash.com/photo-1535016120720-40c646bebbbb?auto=format&fit=crop&q=80&w=1000", amount: 1500, currency: "TZS", description: "Hollywood and International high-octane action.", createdAt: 1713744000000 },
  "seasons": { id: "seasons", name: "Seasons", thumbnail: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1000", amount: 2000, currency: "TZS", description: "Complete series and trending TV seasons.", createdAt: 1713744000000 },
  "connection-tia": { id: "connection-tia", name: "Connection TIA", thumbnail: "https://images.unsplash.com/photo-1523050853063-bd75160b332a?auto=format&fit=crop&q=80&w=1000", amount: 1000, currency: "TZS", description: "Exclusive University lifestyle and campus stories.", createdAt: 1713744000000 }
};

export default function MovieGroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<MovieGroup | null>(null);
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState(() => localStorage.getItem("guestPhone") || "");
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    // Fetch Group
    const groupRef = ref(db, `movieGroups/${groupId}`);
    const unsubGroup = onValue(groupRef, (snap) => {
      if (snap.exists()) {
        setGroup(snap.val());
      } else if (DEFAULT_GROUPS[groupId]) {
        setGroup(DEFAULT_GROUPS[groupId]);
      }
      setLoading(false);
    });

    // Fetch Movies
    const moviesRef = ref(db, `movies`);
    const unsubMovies = onValue(moviesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const filtered = Object.entries(data)
          .map(([id, v]: any) => ({ ...v, id }))
          .filter((m: Movie) => m.groupId === groupId);
        setMovies(filtered.length > 0 ? filtered : null);
      } else {
        setMovies(null);
      }
    });

    return () => {
      unsubGroup();
      unsubMovies();
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    
    // Determine the UID to check for purchase (either logged in user or formatted guest phone)
    let checkUid = user?.uid;
    if (!checkUid && buyerPhone) {
      let formattedPhone = buyerPhone.replace(/\s+/g, "").replace(/^\+/, "");
      if (formattedPhone.startsWith("0")) formattedPhone = "255" + formattedPhone.slice(1);
      else if (!formattedPhone.startsWith("255") && formattedPhone.length === 9) formattedPhone = "255" + formattedPhone;
      if (formattedPhone.length >= 10) checkUid = formattedPhone;
    }

    if (!checkUid) {
      setPurchase(null);
      return;
    }

    const purchaseRef = ref(db, `purchases/${checkUid}/movieGroups/${groupId}`);
    const unsubPurchase = onValue(purchaseRef, (snap) => {
      setPurchase(snap.val());
    });
    return () => unsubPurchase();
  }, [user, groupId, buyerPhone]);

  useEffect(() => {
    if (!user) return;
    const dn = user.displayName?.trim();
    if (dn && dn.split(/\s+/).length >= 2) setBuyerName(dn);
    if (user.email) setBuyerEmail(user.email);
  }, [user]);

  const finalMovies = useMemo(() => {
    return movies || [];
  }, [movies]);

  const { unlocked, daysLeft } = useMemo(() => {
    if (purchase?.status === "completed") {
      if (!purchase.paidAt) return { unlocked: true, daysLeft: "Lifetime" };
      const expiresAt = purchase.paidAt + 5 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now < expiresAt) {
        const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
        return { unlocked: true, daysLeft };
      }
    }
    return { unlocked: false, daysLeft: 0 };
  }, [purchase]);

  async function startPayment() {
    if (!groupId || !buyerPhone) return;
    setPayBusy(true);
    setPayError(null);
    try {
      localStorage.setItem("guestPhone", buyerPhone); // Save for later unlocking
      
      let idToken = null;
      if (user) {
        try { idToken = await user.getIdToken(); } catch(e) {}
      }
      
      const res = await fetch(apiUrl("/api/checkout/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          movieGroupId: groupId,
          buyer: { name: "MOVIES COMPANY", email: "movies@company.com", phone: buyerPhone },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Payment failed.");
      sessionStorage.setItem("checkoutOrderId", String(data.orderId));
      navigate("/payment/return");
    } catch (e: any) {
      setPayError(e.message);
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

  if (!group) {
    return <Shell><div className="alert">Group not found.</div></Shell>;
  }

  return (
    <Shell>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" className="btn btn-ghost" style={{ marginBottom: 16 }}>← Back to Groups</Link>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
             <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 16, overflow: "hidden", border: "1px solid var(--stroke)" }}>
                <img src={group.thumbnail} alt={group.name} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
             </div>
          </div>
          <div style={{ flex: "2 1 400px" }}>
            <h1 style={{ fontSize: "clamp(24px, 6vw, 32px)", margin: 0, color: unlocked ? "var(--accent)" : "#bae6fd", lineHeight: 1.2 }}>{group.name}</h1>
            <p className="muted" style={{ fontSize: "clamp(14px, 4vw, 16px)", margin: "8px 0 20px" }}>{group.description}</p>
            {!unlocked && (
              <div className="card" style={{ 
                maxWidth: 360,
                border: "none", 
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                boxShadow: "0 12px 40px rgba(14, 165, 233, 0.35)",
                color: "#fff",
                borderRadius: 20
              }}>
                <div className="card-body" style={{ padding: "20px" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                     <span style={{ fontSize: 32, background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: 12 }}>🔓</span>
                     <div>
                       <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Unlock Now</h2>
                       <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Access for 5 days.</p>
                     </div>
                  </div>
                  
                  {payError && <div style={{ background: "rgba(239, 68, 68, 0.9)", color: "#fff", padding: "10px 12px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 700 }}>{payError}</div>}
                  
                  <div style={{ background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 16, marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.9)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Phone</label>
                    <input 
                      value={buyerPhone} 
                      onChange={e => setBuyerPhone(e.target.value)} 
                      placeholder="e.g. 07XXXXXXXX"
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)",
                        background: "rgba(255,255,255,0.95)", color: "#000", fontSize: 18, fontWeight: 900,
                        outline: "none", transition: "border 0.2s"
                      }}
                      onFocus={e => e.target.style.borderColor = "#10b981"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                    />
                  </div>
                  
                  <button 
                    disabled={payBusy || !buyerPhone} 
                    onClick={startPayment} 
                    style={{ 
                      width: "100%", padding: "16px", borderRadius: 12, border: "none",
                      background: "linear-gradient(90deg, #10b981, #059669)", color: "#fff", 
                      fontSize: 18, fontWeight: 900, cursor: (payBusy || !buyerPhone) ? "not-allowed" : "pointer",
                      boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)", opacity: (payBusy || !buyerPhone) ? 0.7 : 1,
                      transition: "transform 0.1s"
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    {payBusy ? "PROCESSING..." : `PAY ${group.amount} ${group.currency}`}
                  </button>

                  {!unlocked && buyerPhone && purchase?.status !== "completed" && (
                    <button 
                      onClick={() => setPurchase({ status: "checking" } as any)} 
                      style={{ 
                        width: "100%", marginTop: 14, padding: "10px", background: "rgba(255,255,255,0.1)", 
                        border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.95)", 
                        fontSize: 13, fontWeight: 800, borderRadius: 10, cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    >
                      Already paid? Check status
                    </button>
                  )}
                </div>
              </div>
            )}
            {unlocked && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--accent)", fontWeight: 700, fontSize: 18 }}>
                <span style={{ fontSize: 24 }}>✅</span> Group Unlocked - {daysLeft === "Lifetime" ? "Lifetime Access" : `${daysLeft} Days Left`}
              </div>
            )}
          </div>
        </div>
      </div>

      {unlocked && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ marginBottom: 24, fontSize: "clamp(20px, 4vw, 24px)" }}>Movies in this Group</h2>
          <div className="grid cols-3 cols-2-mobile" style={{ gap: 16 }}>
            {finalMovies.map((movie, idx) => (
              <div 
                key={movie.id || idx} 
                className="card" 
                style={{ cursor: "pointer", border: "1px solid var(--stroke)", overflow: "hidden" }}
                onClick={() => setActiveMovie(movie)}
              >
                <div style={{ position: "relative", paddingTop: "56.25%", background: "#111" }}>
                  {movie.youtubeId ? (
                    <img src={`https://img.youtube.com/vi/${movie.youtubeId}/hqdefault.jpg`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(45deg, #0f172a, #1a1a1a)" }}>
                       <span style={{ fontSize: 32 }}>🎞️</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0f172a"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ padding: 12 }}>
                  <h3 style={{ fontSize: 14, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{movie.title}</h3>
                  {!movie.youtubeId && <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 4, fontWeight: 700 }}>PREMIUM UPLOAD</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMovie && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
          onClick={() => setActiveMovie(null)}
        >
          <div style={{ width: "90%", maxWidth: 1000, position: "relative" }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setActiveMovie(null)}
              style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#0f172a", fontSize: 24, cursor: "pointer" }}
            >✕ Close</button>
            <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", borderRadius: 16, overflow: "hidden", border: "1px solid var(--stroke)" }}>
              {activeMovie.videoUrl ? (
                <video 
                  src={activeMovie.videoUrl} 
                  controls 
                  autoPlay 
                  playsInline
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "#000" }} 
                />
              ) : (
                <iframe 
                  src={`https://www.youtube.com/embed/${activeMovie.youtubeId}?autoplay=1`}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                  frameBorder="0"
                  allowFullScreen
                />
              )}
            </div>
            <h2 style={{ marginTop: 16, color: "#0f172a" }}>{activeMovie.title}</h2>
          </div>
        </div>
      )}
    </Shell>
  );
}
