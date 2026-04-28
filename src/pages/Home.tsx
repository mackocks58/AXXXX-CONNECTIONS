import { useEffect, useState, useMemo } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import type { MovieGroup, Movie } from "@/types";

const DEFAULT_GROUPS: MovieGroup[] = [
  { id: "connection-bongo", name: "Connection Za Bongo", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000", amount: 1000, currency: "TZS", description: "The most trending bongo connections and dramas.", createdAt: 1713744000000 },
  { id: "bongo-wiki-hii", name: "Bongo Wiki Hii", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000", amount: 500, currency: "TZS", description: "New Tanzanian movies released this week.", createdAt: 1713744000000 },
  { id: "action-movies", name: "Action Movies", thumbnail: "https://images.unsplash.com/photo-1535016120720-40c646bebbbb?auto=format&fit=crop&q=80&w=1000", amount: 1500, currency: "TZS", description: "Hollywood and International high-octane action.", createdAt: 1713744000000 },
  { id: "seasons", name: "Seasons", thumbnail: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1000", amount: 2000, currency: "TZS", description: "Complete series and trending TV seasons.", createdAt: 1713744000000 },
  { id: "connection-tia", name: "Connection TIA", thumbnail: "https://images.unsplash.com/photo-1523050853063-bd75160b332a?auto=format&fit=crop&q=80&w=1000", amount: 1000, currency: "TZS", description: "Exclusive University lifestyle and campus stories.", createdAt: 1713744000000 }
];

export default function Home() {
  const { user } = useAuth();
  const [firebaseGroups, setFirebaseGroups] = useState<Record<string, MovieGroup> | null>(null);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [userPurchases, setUserPurchases] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  
  // For guest users, we use the saved phone number
  const guestPhone = localStorage.getItem("guestPhone");

  useEffect(() => {
    // Fetch Groups
    const groupsRef = ref(db, "movieGroups");
    const unsubGroups = onValue(groupsRef, (snap) => {
      setFirebaseGroups(snap.val());
      setLoading(false);
    });

    // Fetch Movies (to count them)
    const moviesRef = ref(db, "movies");
    const unsubMovies = onValue(moviesRef, (snap) => {
      const data = snap.val();
      if (data) {
        setAllMovies(Object.entries(data).map(([id, v]: any) => ({ ...v, id })));
      } else {
        setAllMovies([]);
      }
    });

    return () => {
      unsubGroups();
      unsubMovies();
    };
  }, []);

  useEffect(() => {
    // Check purchase status using user ID or guest phone
    let checkUid = user?.uid;
    if (!checkUid && guestPhone) {
      let formattedPhone = guestPhone.replace(/\s+/g, "").replace(/^\+/, "");
      if (formattedPhone.startsWith("0")) formattedPhone = "255" + formattedPhone.slice(1);
      else if (!formattedPhone.startsWith("255") && formattedPhone.length === 9) formattedPhone = "255" + formattedPhone;
      if (formattedPhone.length >= 10) checkUid = formattedPhone;
    }

    if (!checkUid) {
      setUserPurchases(null);
      return;
    }

    const purchaseRef = ref(db, `purchases/${checkUid}/movieGroups`);
    const unsubPurchases = onValue(purchaseRef, (snap) => {
      setUserPurchases(snap.val());
    });

    return () => unsubPurchases();
  }, [user, guestPhone]);

  const groups = useMemo(() => {
    if (firebaseGroups && Object.keys(firebaseGroups).length > 0) {
      return Object.entries(firebaseGroups).map(([id, v]) => ({ ...v, id }));
    }
    return DEFAULT_GROUPS;
  }, [firebaseGroups]);

  const isPurchased = (groupId: string) => {
    return userPurchases && userPurchases[groupId]?.status === "completed";
  };

  const getMovieCount = (groupId: string) => {
    return allMovies.filter(m => m.groupId === groupId).length;
  };

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
      <div style={{ marginBottom: 32, textAlign: "center", padding: "0 16px" }}>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="breathe" style={{ display: "inline-block", color: "var(--accent)" }}>🎬</span> Premium Movie Groups
        </h1>
        <p className="muted" style={{ margin: "8px 0 16px 0", fontSize: "clamp(14px, 4vw, 16px)" }}>
          Unlock exclusive movie connections and the latest blockbusters instantly.
        </p>
      </div>

      <div className="grid cols-3 cols-3-mobile" style={{ gap: "clamp(16px, 3vw, 24px)", padding: "0 8px" }}>
        {groups.map((group) => {
          const unlocked = isPurchased(group.id!);
          const movieCount = getMovieCount(group.id!);
          
          return (
            <Link 
              key={group.id} 
              to={`/movies/${group.id}`}
              className="card movie-group-card" 
              style={{ 
                background: "linear-gradient(135deg, rgba(11, 18, 36, 0.9), rgba(248, 250, 252, 0.95))", 
                border: "1px solid var(--stroke)", 
                transition: "transform 0.3s ease, box-shadow 0.3s ease", 
                cursor: "pointer",
                overflow: "hidden",
                textDecoration: "none",
                display: "block"
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = "translateY(-6px)"; 
                e.currentTarget.style.boxShadow = unlocked ? "0 12px 30px rgba(16, 185, 129, 0.2)" : "0 12px 30px rgba(14, 165, 233, 0.15)"; 
                e.currentTarget.style.borderColor = unlocked ? "var(--accent)" : "#0ea5e9"; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = "none"; 
                e.currentTarget.style.boxShadow = "var(--shadow)"; 
                e.currentTarget.style.borderColor = "var(--stroke)"; 
              }}
            >
              <div style={{ position: "relative", width: "100%", paddingTop: "100%" }}>
                <img 
                  src={group.thumbnail}
                  alt={group.name}
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover",
                    filter: unlocked ? "none" : "blur(4px) brightness(0.6)"
                  }} 
                />
                
                {/* Movie Count Badge */}
                <div style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backdropFilter: "blur(4px)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  zIndex: 2
                }}>
                  🎞️ {movieCount} {movieCount === 1 ? "Movie" : "Movies"}
                </div>

                {!unlocked && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(15, 23, 42, 0.4)"
                  }}>
                    <span className="breathe" style={{ fontSize: 40, marginBottom: 12 }}>🔒</span>
                    <span style={{ 
                      background: "rgba(14, 165, 233, 0.9)", 
                      color: "#000", 
                      padding: "6px 12px", 
                      borderRadius: 20, 
                      fontSize: 14, 
                      fontWeight: 800,
                      boxShadow: "0 0 20px rgba(14, 165, 233, 0.5)"
                    }}>
                      {group.amount} {group.currency}
                    </span>
                  </div>
                )}
                {unlocked && (
                  <div style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(16, 185, 129, 0.9)",
                    color: "#0f172a",
                    padding: "4px 8px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                    zIndex: 2
                  }}>
                    UNLOCKED
                  </div>
                )}
              </div>
              <div className="card-body" style={{ padding: "12px 16px" }}>
                <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 700, color: unlocked ? "var(--accent)" : "#bae6fd" }}>
                  {group.name}
                </h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {group.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
