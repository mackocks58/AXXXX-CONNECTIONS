import { Link } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/firebase";

export default function Account() {
  const { user, isAdmin, logout } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Load followed users
    const followRef = ref(db, `userFollowing/${user.uid}`);
    const followSub = onValue(followRef, (snap) => {
      const data = snap.val() as Record<string, boolean> | null;
      if (data) {
        setFollowing(Object.keys(data).filter(k => data[k]));
      } else {
        setFollowing([]);
      }
    });

    // Load created channels
    const channelsRef = ref(db, "chatChannels");
    const channelsSub = onValue(channelsRef, (snap) => {
      const data = snap.val() as Record<string, { createdBy: string; name: string }> | null;
      if (data) {
        setChannels(Object.values(data).filter(c => c.createdBy === user.uid).map(c => c.name));
      } else {
        setChannels([]);
      }
    });

    return () => {
      followSub();
      channelsSub();
    };
  }, [user]);

  if (!user) {
    return (
      <Shell>
        <div className="alert">Log in to view your account. <Link to="/login">Log in</Link></div>
      </Shell>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Good night";
  };

  const firstName = (user.displayName || user.email?.split("@")[0] || "User").split(" ")[0];

  return (
    <Shell>
      <div style={{ padding: "16px 0 24px", textAlign: "center", marginBottom: 24, background: "linear-gradient(180deg, rgba(56, 189, 248, 0.08), transparent)", borderRadius: "var(--radius)" }}>
        <div className="breathe" style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent2))", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#0f172a", boxShadow: "0 8px 24px rgba(56, 189, 248, 0.3)" }}>
          {firstName.charAt(0).toUpperCase()}
        </div>
        <h1 className="page-title" style={{ margin: "0 0 8px" }}>
          {getGreeting()}, <span style={{ color: "var(--accent)" }}>{firstName}</span>!
        </h1>
        <p className="muted" style={{ margin: 0 }}>Welcome back to your dashboard.</p>
      </div>
      
      <div className="split">
        <div className="card" style={{ borderTop: "3px solid var(--accent)" }}>
          <div className="card-body">
            <h2 style={{ margin: "0 0 20px", fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span>👤</span> Profile Details
            </h2>
            
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Full Name</label>
              <div className="input" style={{ background: "rgba(248, 250, 252, 0.3)", padding: "12px 16px", fontSize: 15 }}>
                {user.displayName || "Not set"}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Email Address</label>
              <div className="input" style={{ background: "rgba(248, 250, 252, 0.3)", padding: "12px 16px", fontSize: 15 }}>
                {user.email}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label>User ID</label>
              <div className="input mono" style={{ background: "rgba(248, 250, 252, 0.3)", padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>
                {user.uid}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <label>Account Role</label>
              <div style={{ marginTop: 8 }}>
                <span className="badge" style={{ padding: "8px 16px", background: isAdmin ? "rgba(52, 211, 153, 0.15)" : "rgba(148, 163, 184, 0.15)", color: isAdmin ? "var(--accent2)" : "var(--muted)", borderColor: isAdmin ? "rgba(52, 211, 153, 0.4)" : "var(--stroke)", boxShadow: isAdmin ? "0 0 12px rgba(52, 211, 153, 0.2)" : "none" }}>
                  {isAdmin ? "👑 Administrator" : "Standard User"}
                </span>
              </div>
            </div>

            <button className="btn btn-danger" style={{ width: "100%", padding: "12px" }} onClick={() => void logout()}>
              Sign Out Securely
            </button>
          </div>
        </div>

        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.8))", borderColor: "rgba(56, 189, 248, 0.2)" }}>
            <div className="card-body">
              <h2 style={{ margin: "0 0 16px", fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <span>🌟</span> Social Activity
              </h2>
              <div className="row" style={{ gap: 24 }}>
                <div style={{ flex: 1, background: "rgba(248, 250, 252, 0.5)", padding: 16, borderRadius: 12, border: "1px solid var(--stroke)", textAlign: "center" }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Following</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>{following.length}</div>
                </div>
                <div style={{ flex: 1, background: "rgba(248, 250, 252, 0.5)", padding: 16, borderRadius: 12, border: "1px solid var(--stroke)", textAlign: "center" }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>My Channels</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent2)" }}>{channels.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.8))", borderColor: "rgba(14, 165, 233, 0.2)" }}>
            <div className="card-body">
              <h2 style={{ margin: "0 0 16px", fontSize: 18, display: "flex", alignItems: "center", gap: 8, color: "#bae6fd" }}>
                <span>✨</span> Affiliate Program
              </h2>
              <p className="muted" style={{ marginBottom: 16, fontSize: 14 }}>
                Invite your friends to Zyntra and earn commissions for every successful registration!
              </p>
              <Link to="/affiliate" className="btn" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(161,98,7,0.3))", borderColor: "rgba(14, 165, 233, 0.5)", color: "#bae6fd", fontWeight: 700, padding: "12px" }}>
                Open Affiliate Dashboard
              </Link>
            </div>
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.8))", borderColor: "rgba(56, 189, 248, 0.2)" }}>
            <div className="card-body">
              <h2 style={{ margin: "0 0 16px", fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="breathe" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--danger)" }}></span> Live Center
              </h2>
              <p className="muted" style={{ marginBottom: 16, fontSize: 14 }}>
                Track live matches with our real-time visual simulation and live score tracker.
              </p>
              <Link to="/live" className="btn" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(12,74,110,0.3))", borderColor: "rgba(56,189,248,0.5)", color: "var(--accent)", fontWeight: 700, padding: "12px" }}>
                Enter Live Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
