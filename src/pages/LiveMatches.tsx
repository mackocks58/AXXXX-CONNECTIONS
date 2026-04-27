import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/Shell";

type LiveMatch = {
  fixture: {
    id: number;
    status: { elapsed: number; long: string };
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number; away: number };
  events: any[];
};

export default function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Simulation states
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [attackSide, setAttackSide] = useState<"home" | "away" | "neutral">("neutral");
  const [actionText, setActionText] = useState("Ball in play");

  const headers = { 'x-apisports-key': '5c7ec841c0b922b7deaf823b8880a068' };

  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', { headers });
        const data = await res.json();
        if (data.response) {
          setMatches(data.response);
          if (data.response.length > 0 && !selectedMatch) {
            setSelectedMatch(data.response[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLive();
    const interval = setInterval(fetchLive, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Visual Simulation Logic
  useEffect(() => {
    if (!selectedMatch) return;
    
    const simInterval = setInterval(() => {
      // Randomly move the ball
      const newX = 20 + Math.random() * 60; // Stay within 20-80% for better visuals
      const newY = 10 + Math.random() * 80;
      
      setBallPos({ x: newX, y: newY });
      
      // Determine attack status
      if (newX < 35) {
        setAttackSide("home");
        setActionText(Math.random() > 0.7 ? "DANGEROUS ATTACK!" : "Home Possession");
      } else if (newX > 65) {
        setAttackSide("away");
        setActionText(Math.random() > 0.7 ? "DANGEROUS ATTACK!" : "Away Possession");
      } else {
        setAttackSide("neutral");
        setActionText("Midfield Battle");
      }
    }, 3000);
    
    return () => clearInterval(simInterval);
  }, [selectedMatch]);

  return (
    <Shell>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="breathe" style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--danger)", boxShadow: "0 0 10px var(--danger)" }}></span>
          Live Center
        </h1>
        <p className="muted">Real-time match tracker and visual simulation.</p>
      </div>

      <style>{`
        .live-layout {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
        }
        @media (max-width: 980px) {
          .live-layout {
            grid-template-columns: 1fr;
          }
          .live-sidebar {
            order: 2;
          }
          .live-main {
            order: 1;
          }
        }
      `}</style>

      <div className="live-layout">
        {/* Left: Tracker & Stream */}
        <div className="live-main" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {selectedMatch ? (
            <div className="card" style={{ padding: 0, overflow: "hidden", background: "var(--bg2)", border: "1px solid var(--stroke)" }}>
              {/* Header: Scores */}
              <div style={{ padding: "16px", background: "linear-gradient(180deg, rgba(56, 189, 248, 0.1), transparent)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                   <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedMatch.teams.home.name}</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 100 }}>
                   <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>{selectedMatch.goals.home} - {selectedMatch.goals.away}</div>
                   <div style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>{selectedMatch.fixture.status.elapsed}'</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                   <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedMatch.teams.away.name}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, background: "rgba(15, 23, 42, 0.05)", position: "relative" }}>
                 <div style={{ 
                   height: "100%", 
                   width: `${Math.min(100, (selectedMatch.fixture.status.elapsed / 90) * 100)}%`, 
                   background: "var(--accent)",
                   boxShadow: "0 0 10px var(--accent)",
                   transition: "width 1s ease-in-out"
                 }} />
              </div>

              {/* Visual Simulation Pitch */}
              <div style={{ 
                height: 300,
                maxHeight: "50vh",
                background: "linear-gradient(180deg, #10b981 0%, #059669 100%)", 
                position: "relative",
                margin: "12px",
                borderRadius: 12,
                border: "3px solid rgba(15, 23, 42, 0.3)",
                overflow: "hidden"
              }}>
                {/* Pitch Markings */}
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(15, 23, 42, 0.3)" }} />
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, border: "2px solid rgba(15, 23, 42, 0.3)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", left: -2, top: "25%", bottom: "25%", width: "15%", border: "2px solid rgba(15, 23, 42, 0.3)" }} />
                <div style={{ position: "absolute", right: -2, top: "25%", bottom: "25%", width: "15%", border: "2px solid rgba(15, 23, 42, 0.3)" }} />

                {/* Animated Ball */}
                <div style={{ 
                  position: "absolute", 
                  left: `${ballPos.x}%`, 
                  top: `${ballPos.y}%`, 
                  width: 14, 
                  height: 14, 
                  background: "#0f172a", 
                  borderRadius: "50%", 
                  boxShadow: "0 0 15px #0f172a",
                  transition: "all 3s cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 10
                }} />

                {/* Overlay Text */}
                <div style={{ 
                  position: "absolute", 
                  bottom: 20, 
                  left: "50%", 
                  transform: "translateX(-50%)",
                  background: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(4px)",
                  padding: "8px 20px",
                  borderRadius: 20,
                  color: attackSide === "neutral" ? "#0f172a" : "var(--accent)",
                  fontWeight: 800,
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  zIndex: 20,
                  border: "1px solid rgba(15, 23, 42, 0.1)"
                }}>
                  {actionText}
                </div>

                {/* Team Logos on Pitch */}
                <img src={selectedMatch.teams.home.logo} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", width: 60, opacity: 0.2, filter: "grayscale(1) brightness(2)" }} />
                <img src={selectedMatch.teams.away.logo} style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 60, opacity: 0.2, filter: "grayscale(1) brightness(2)" }} />
              </div>

              {/* Match Stats Simulation (Placeholder) */}
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
                 <div className="card" style={{ padding: 12, background: "rgba(15, 23, 42, 0.02)" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>POSSESSION</div>
                    <div style={{ fontWeight: 800 }}>52% - 48%</div>
                 </div>
                 <div className="card" style={{ padding: 12, background: "rgba(15, 23, 42, 0.02)" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>SHOTS ON TARGET</div>
                    <div style={{ fontWeight: 800 }}>4 - 2</div>
                 </div>
                 <div className="card" style={{ padding: 12, background: "rgba(15, 23, 42, 0.02)" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>CORNERS</div>
                    <div style={{ fontWeight: 800 }}>6 - 3</div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 60, textAlign: "center" }}>
               {loading ? "Finding live matches..." : "No matches are live right now. Check back during kick-off!"}
            </div>
          )}

          {/* Events List */}
          {selectedMatch && (
            <div className="card" style={{ padding: 24 }}>
               <h3 style={{ margin: "0 0 16px 0" }}>Live Events</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Simulate some events if empty */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 35, fontWeight: 800, color: "var(--accent)" }}>72'</div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                       <span>⚽</span> <strong>GOAL!</strong> {selectedMatch.teams.home.name} scored.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.7 }}>
                    <div style={{ width: 35, fontWeight: 800 }}>54'</div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                       <span>🔴</span> <strong>RED CARD</strong> for {selectedMatch.teams.away.name} defender.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.7 }}>
                    <div style={{ width: 35, fontWeight: 800 }}>31'</div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                       <span>🟨</span> Yellow Card for {selectedMatch.teams.home.name}.
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Other Live Matches */}
        <div className="live-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
           <h3 style={{ margin: 0, fontSize: 16 }}>Other Live Matches</h3>
           {matches.map(m => (
             <div 
               key={m.fixture.id} 
               onClick={() => setSelectedMatch(m)}
               style={{ 
                 cursor: "pointer", 
                 background: selectedMatch?.fixture.id === m.fixture.id ? "rgba(56, 189, 248, 0.1)" : "var(--bg2)",
                 border: selectedMatch?.fixture.id === m.fixture.id ? "1px solid var(--accent)" : "1px solid var(--stroke)",
                 borderRadius: 12,
                 padding: 12,
                 transition: "all 0.2s"
               }}
             >
               <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 800 }}>{m.fixture.status.elapsed}'</span>
                  <span className="breathe" style={{ color: "var(--danger)", fontSize: 10, fontWeight: 800 }}>LIVE</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                     <img src={m.teams.home.logo} width={18} />
                     <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.teams.home.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, padding: "0 8px" }}>{m.goals.home}</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                     <img src={m.teams.away.logo} width={18} />
                     <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.teams.away.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, padding: "0 8px" }}>{m.goals.away}</span>
               </div>
             </div>
           ))}
        </div>
      </div>
    </Shell>
  );
}
