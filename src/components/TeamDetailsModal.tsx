import { useEffect, useState } from "react";

type TeamDetailsModalProps = {
  teamId: number;
  fixtureId: string;
  leagueId: number;
  season: number;
  teamName: string;
  teamLogo: string;
  onClose: () => void;
};

export function TeamDetailsModal({ teamId, fixtureId, leagueId, season, teamName, teamLogo, onClose }: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [leagueStandings, setLeagueStandings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [lineup, setLineup] = useState<any>(null);
  const [squad, setSquad] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "standings" | "history" | "squad">("overview");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const headers = { 'x-apisports-key': '5c7ec841c0b922b7deaf823b8880a068' };
        
        // Parallel requests
        const [standRes, lineupRes, squadRes, histRes] = await Promise.all([
          fetch(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`, { headers }),
          fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, { headers }),
          fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, { headers }),
          fetch(`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`, { headers })
        ]);

        const standData = await standRes.json();
        if (standData.response?.[0]?.league?.standings?.[0]) {
          setLeagueStandings(standData.response[0].league.standings[0]);
        }

        const lineupData = await lineupRes.json();
        const teamLineup = lineupData.response?.find((l: any) => l.team.id === teamId);
        if (teamLineup && teamLineup.startXI && teamLineup.startXI.length > 0) {
          setLineup(teamLineup);
        }

        const squadData = await squadRes.json();
        if (squadData.response?.[0]?.players) {
          setSquad(squadData.response[0].players);
        }

        const histData = await histRes.json();
        if (histData.response) {
          setHistory(histData.response);
        }
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [teamId, fixtureId, leagueId, season]);

  const teamStanding = leagueStandings.find(s => s.team.id === teamId);

  // Helper to render pitch
  const renderPitch = () => {
    let activeLineup = lineup;
    
    // If no official lineup is available yet, create a predicted 4-4-2 from the squad
    if (!activeLineup || !activeLineup.startXI) {
      if (squad.length === 0) return null;
      
      const gk = squad.filter(p => p.position === "Goalkeeper").slice(0, 1);
      const def = squad.filter(p => p.position === "Defender").slice(0, 4);
      const mid = squad.filter(p => p.position === "Midfielder").slice(0, 4);
      const att = squad.filter(p => p.position === "Attacker").slice(0, 2);
      
      const startXI: any[] = [];
      if (gk[0]) startXI.push({ player: { ...gk[0], grid: "1:1" } });
      def.forEach((p, i) => startXI.push({ player: { ...p, grid: `2:${i + 1}` } }));
      mid.forEach((p, i) => startXI.push({ player: { ...p, grid: `3:${i + 1}` } }));
      att.forEach((p, i) => startXI.push({ player: { ...p, grid: `4:${i + 1}` } }));
      
      activeLineup = {
        formation: "4-4-2 (Predicted)",
        startXI,
        substitutes: squad.filter(p => !startXI.find(s => s.player.id === p.id)).slice(0, 7).map(p => ({ player: p }))
      };
    }

    const rows: Record<string, any[]> = {};
    activeLineup.startXI.forEach((item: any) => {
      const grid = item.player.grid;
      if (!grid) return;
      const [x, y] = grid.split(':');
      if (!rows[x]) rows[x] = [];
      
      // Try to find photo from squad if not already present
      if (!item.player.photo) {
        const squadPlayer = squad.find(p => p.id === item.player.id || p.number === item.player.number);
        if (squadPlayer) {
          item.player.photo = squadPlayer.photo;
        }
      }
      
      rows[x].push(item.player);
    });

    const sortedRows = Object.keys(rows).sort((a, b) => Number(a) - Number(b));

    return (
      <div style={{ padding: 16, background: "rgba(16, 185, 129, 0.05)", borderRadius: 16 }}>
        <h3 style={{ margin: "0 0 16px 0", textAlign: "center", color: "var(--accent)", display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Formation: {activeLineup.formation || "Unknown"}</span>
          {!lineup && <span style={{ fontSize: 12, color: "var(--danger)" }}>*Official lineup not announced yet. Showing predicted squad.*</span>}
        </h3>
        <div style={{ 
          position: "relative", 
          width: "100%", 
          maxWidth: 400, 
          margin: "0 auto", 
          aspectRatio: "2/3",
          background: "repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(15, 23, 42, 0.06) 10%, rgba(15, 23, 42, 0.06) 20%), linear-gradient(180deg, #10b981 0%, #059669 100%)",
          border: "4px solid #0f172a",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column-reverse", 
          justifyContent: "space-around"
        }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(15, 23, 42, 0.4)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(15, 23, 42, 0.4)" }} />
          <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: "40%", height: "15%", border: "2px solid rgba(15, 23, 42, 0.4)" }} />
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: "40%", height: "15%", border: "2px solid rgba(15, 23, 42, 0.4)" }} />
          
          {sortedRows.map((x) => {
            const playersInRow = rows[x].sort((a: any, b: any) => {
              const yA = a.grid ? Number(a.grid.split(':')[1]) : 0;
              const yB = b.grid ? Number(b.grid.split(':')[1]) : 0;
              return yA - yB;
            });
            
            return (
              <div key={x} style={{ display: "flex", justifyContent: "space-around", zIndex: 10 }}>
                {playersInRow.map((player) => (
                  <div 
                    key={player.id} 
                    onClick={() => setActivePlayerId(player.id)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "25%", cursor: "pointer", transition: "transform 0.2s" }} 
                    onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"} 
                    onMouseLeave={e => e.currentTarget.style.transform="none"}
                  >
                    <div style={{ position: "relative", width: 44, height: 44, marginBottom: 2 }}>
                      {player.photo ? (
                        <img src={player.photo} alt={player.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "2px solid #0f172a", backgroundColor: "#0f172a", boxShadow: "0 4px 10px rgba(15, 23, 42, 0.5)" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #ddd", boxShadow: "0 4px 10px rgba(15, 23, 42, 0.5)" }}>
                           <span style={{color:"#059669", fontSize:14, fontWeight:800}}>{player.number}</span>
                        </div>
                      )}
                      {!player.photo && <div style={{ position: "absolute", bottom: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "#0f172a", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", border: "1px solid #0f172a" }}>{player.number}</div>}
                    </div>
                    <div style={{ 
                      fontSize: 11, color: "#0f172a", textShadow: "0 1px 3px rgba(15, 23, 42, 0.8), 0 1px 1px rgba(15, 23, 42, 1)",
                      textAlign: "center", marginTop: 2, fontWeight: 800,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                      background: "rgba(15, 23, 42, 0.4)", padding: "2px 6px", borderRadius: 4
                    }}>
                      {player.name}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {activeLineup.substitutes && activeLineup.substitutes.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--muted)" }}>Substitutes</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {activeLineup.substitutes.map((item: any) => (
                <span key={item.player.id} className="pill" style={{ fontSize: 11 }}>
                  {item.player.number || "-"} • {item.player.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStandingsTable = () => (
    <div style={{ overflowX: "auto" }}>
      <table className="table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Club</th>
            <th>MP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF:GA</th>
            <th>GD</th>
            <th>Pts</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {leagueStandings.map((s) => (
            <tr key={s.team.id} style={{ background: s.team.id === teamId ? "rgba(16,185,129,0.15)" : "transparent" }}>
              <td style={{ fontWeight: s.team.id === teamId ? "bold" : "normal", color: s.team.id === teamId ? "var(--accent)" : "inherit" }}>{s.rank}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={s.team.logo} alt={s.team.name} width={20} height={20} />
                  <span style={{ fontWeight: s.team.id === teamId ? "bold" : "normal" }}>{s.team.name}</span>
                </div>
              </td>
              <td>{s.all.played}</td>
              <td>{s.all.win}</td>
              <td>{s.all.draw}</td>
              <td>{s.all.lose}</td>
              <td>{s.all.goals.for}:{s.all.goals.against}</td>
              <td>{s.goalsDiff}</td>
              <td style={{ fontWeight: "bold" }}>{s.points}</td>
              <td>
                <div style={{ display: "flex", gap: 2 }}>
                  {s.form?.split('').map((f: string, i: number) => (
                    <span key={i} style={{ width: 14, height: 14, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: "bold", background: f === 'W' ? "var(--accent)" : f === 'D' ? "#94a3b8" : "var(--danger)", color: "#0f172a" }}>{f}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHistory = () => (
    <div className="grid" style={{ gap: 12 }}>
      {history.map(m => (
        <div key={m.fixture.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 13, fontWeight: m.teams.home.id === teamId ? "bold" : "normal", color: m.teams.home.winner ? "var(--accent)" : "inherit" }}>{m.teams.home.name}</span>
            <img src={m.teams.home.logo} alt={m.teams.home.name} width={24} height={24} />
          </div>
          <div style={{ padding: "0 16px", fontWeight: 800, fontSize: 18, color: "var(--text)", textAlign: "center" }}>
            {m.goals.home} - {m.goals.away}
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: "normal", marginTop: 4 }}>{new Date(m.fixture.date).toLocaleDateString()}</div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start" }}>
            <img src={m.teams.away.logo} alt={m.teams.away.name} width={24} height={24} />
            <span style={{ fontSize: 13, fontWeight: m.teams.away.id === teamId ? "bold" : "normal", color: m.teams.away.winner ? "var(--accent)" : "inherit" }}>{m.teams.away.name}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSquad = () => {
    // Group squad by position
    const grouped: Record<string, any[]> = {};
    squad.forEach(p => {
      const pos = p.position || "Unknown";
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push(p);
    });

    const posOrder = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
    const positions = Object.keys(grouped).sort((a, b) => posOrder.indexOf(a) - posOrder.indexOf(b));

    return (
      <div>
        {positions.map(pos => (
          <div key={pos} style={{ marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--accent)", borderBottom: "1px solid var(--stroke)", paddingBottom: 8 }}>{pos}s</h4>
            <div className="grid cols-2" style={{ gap: 12 }}>
              {grouped[pos].map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setActivePlayerId(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, background: "rgba(15, 23, 42, 0.03)", borderRadius: 8, cursor: "pointer" }}
                >
                  <img src={p.photo} alt={p.name} width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", background: "#0f172a" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>No. {p.number || "-"} • Age: {p.age || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 650, maxHeight: "90vh",
        background: "var(--bg1)", borderRadius: 24, border: "1px solid var(--stroke)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.5)", display: "flex", flexDirection: "column", overflow: "hidden"
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: 24, borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <img src={teamLogo} alt={teamName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{teamName}</h2>
            {teamStanding && (
              <p style={{ margin: "4px 0 0 0", color: "var(--accent)", fontSize: 14, fontWeight: 600 }}>
                League Rank: {teamStanding.rank} • Points: {teamStanding.points}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16, background: "rgba(15, 23, 42, 0.05)", border: "none", color: "var(--muted)",
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--stroke)", overflowX: "auto" }}>
          <button className={`nav-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")} style={tabStyle(activeTab === "overview")}>Overview</button>
          <button className={`nav-tab ${activeTab === "standings" ? "active" : ""}`} onClick={() => setActiveTab("standings")} style={tabStyle(activeTab === "standings")}>League Table</button>
          <button className={`nav-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")} style={tabStyle(activeTab === "history")}>Recent Form</button>
          <button className={`nav-tab ${activeTab === "squad" ? "active" : ""}`} onClick={() => setActiveTab("squad")} style={tabStyle(activeTab === "squad")}>Full Squad</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>
              <span className="breathe" style={{ display: "inline-block", fontSize: 24 }}>⚽</span>
              <div style={{ marginTop: 12 }}>Loading team details...</div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <>
                  {teamStanding && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                      <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(248, 250, 252, 0.5)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Played</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{teamStanding.all?.played}</div>
                      </div>
                      <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(248, 250, 252, 0.5)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Won</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{teamStanding.all?.win}</div>
                      </div>
                      <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(248, 250, 252, 0.5)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Drawn</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{teamStanding.all?.draw}</div>
                      </div>
                      <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(248, 250, 252, 0.5)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Lost</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--danger)" }}>{teamStanding.all?.lose}</div>
                      </div>
                    </div>
                  )}
                  {lineup ? renderPitch() : (
                    <div className="alert info" style={{ textAlign: "center", marginTop: 24 }}>Lineup not announced for this match yet. Check "Full Squad" tab.</div>
                  )}
                </>
              )}
              {activeTab === "standings" && (leagueStandings.length > 0 ? renderStandingsTable() : <div className="alert" style={{ textAlign: "center" }}>Standings not available.</div>)}
              {activeTab === "history" && (history.length > 0 ? renderHistory() : <div className="alert" style={{ textAlign: "center" }}>History not available.</div>)}
              {activeTab === "squad" && (squad.length > 0 ? renderSquad() : <div className="alert" style={{ textAlign: "center" }}>Squad not available.</div>)}
            </>
          )}
        </div>
      </div>
      {activePlayerId && (
        <PlayerDetailsModal 
          playerId={activePlayerId} 
          season={season} 
          onClose={() => setActivePlayerId(null)} 
        />
      )}
    </div>
  );
}

function PlayerDetailsModal({ playerId, season, onClose }: { playerId: number, season: number, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchPlayer() {
      setLoading(true);
      try {
        const headers = { 'x-apisports-key': '5c7ec841c0b922b7deaf823b8880a068' };
        const res = await fetch(`https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`, { headers });
        const data = await res.json();
        if (data.response?.[0]) {
          setPlayerInfo(data.response[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [playerId, season]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
      zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 450,
        background: "var(--bg2)", borderRadius: 20, border: "1px solid var(--stroke)",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.6)", overflow: "hidden"
      }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--accent)" }}>Loading player stats...</div>
        ) : playerInfo ? (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <img src={playerInfo.player.photo} alt={playerInfo.player.name} style={{ width: 80, height: 80, borderRadius: 12, border: "2px solid var(--accent)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>{playerInfo.player.name}</h3>
                <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 14 }}>{playerInfo.statistics[0].team.name} • {playerInfo.statistics[0].games.position}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span className="pill" style={{ fontSize: 11 }}>Age: {playerInfo.player.age}</span>
                  <span className="pill" style={{ fontSize: 11 }}>{playerInfo.player.nationality}</span>
                </div>
              </div>
            </div>
            
            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(15, 23, 42, 0.03)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Appearances</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{playerInfo.statistics[0].games.appearences || 0}</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(15, 23, 42, 0.03)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Goals</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{playerInfo.statistics[0].goals.total || 0}</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(15, 23, 42, 0.03)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Assists</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent2)" }}>{playerInfo.statistics[0].goals.assists || 0}</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: "center", background: "rgba(15, 23, 42, 0.03)" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Rating</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0ea5e9" }}>{parseFloat(playerInfo.statistics[0].games.rating || "0").toFixed(1)}</div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span className="muted">Height</span>
                <span>{playerInfo.player.height || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span className="muted">Weight</span>
                <span>{playerInfo.player.weight || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span className="muted">Yellow Cards</span>
                <span style={{ color: "#fbbf24" }}>{playerInfo.statistics[0].cards.yellow}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span className="muted">Red Cards</span>
                <span style={{ color: "var(--danger)" }}>{playerInfo.statistics[0].cards.red}</span>
              </div>
            </div>

            <button className="btn" style={{ width: "100%", marginTop: 24, padding: 12 }} onClick={onClose}>Close Details</button>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center" }}>No details found for this player.</div>
        )}
      </div>
    </div>
  );
}

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    flex: 1, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer",
    borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
    color: isActive ? "var(--accent)" : "var(--muted)", fontWeight: isActive ? 700 : 500,
    transition: "all 0.2s", fontSize: 14
  };
}
