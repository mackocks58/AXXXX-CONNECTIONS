import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { TeamDetailsModal } from "@/components/TeamDetailsModal";

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  league: string;
  status: string;
  createdAt: number;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId?: number;
  awayTeamId?: number;
  leagueId?: number;
  season?: number;
};

export default function Home() {
  const [firebaseMatches, setFirebaseMatches] = useState<Record<string, Match> | null>(null);
  const [apiMatches, setApiMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const query = (params.get("q") || "").toLowerCase();
  const [tab, setTab] = useState<"live" | "today" | "tomorrow">("today");
  const [activeTeamDetails, setActiveTeamDetails] = useState<{ teamId: number, fixtureId: string, leagueId: number, season: number, teamName: string, teamLogo: string } | null>(null);

  useEffect(() => {
    const r = ref(db, "matches");
    const unsub = onValue(r, (snap) => {
      setFirebaseMatches(snap.val() as Record<string, Match> | null);
    });

    async function fetchApiMatches() {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

        let endpoint = `https://v3.football.api-sports.io/fixtures?date=${todayStr}`;
        if (tab === "live") endpoint = `https://v3.football.api-sports.io/fixtures?live=all`;
        if (tab === "tomorrow") endpoint = `https://v3.football.api-sports.io/fixtures?date=${tomorrowStr}`;

        const res = await fetch(endpoint, {
          headers: { 'x-apisports-key': '5c7ec841c0b922b7deaf823b8880a068' }
        });
        const data = await res.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
          throw new Error("API Error");
        }
        
        if (data.response && data.response.length > 0) {
          const topLeagues = [39, 140, 135, 78, 61, 2, 3, 848];
          let filtered = data.response.filter((m: any) => topLeagues.includes(m.league.id));
          if (filtered.length === 0) filtered = data.response.slice(0, 15);
          
          const formatted: Match[] = filtered.map((m: any) => ({
            id: String(m.fixture.id),
            homeTeam: m.teams.home.name,
            awayTeam: m.teams.away.name,
            homeLogo: m.teams.home.logo,
            awayLogo: m.teams.away.logo,
            time: new Date(m.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            league: m.league.name,
            status: m.fixture.status.short === 'NS' ? 'Upcoming' : 
                    ['1H', '2H', 'HT', 'ET', 'P'].includes(m.fixture.status.short) ? `Live - ${m.fixture.status.elapsed}'` :
                    ['FT', 'AET', 'PEN'].includes(m.fixture.status.short) ? 'Finished' : m.fixture.status.short,
            createdAt: m.fixture.timestamp * 1000,
            homeScore: m.goals?.home ?? null,
            awayScore: m.goals?.away ?? null,
            homeTeamId: m.teams.home.id,
            awayTeamId: m.teams.away.id,
            leagueId: m.league.id,
            season: m.league.season
          }));
          setApiMatches(formatted);
        } else {
          setApiMatches([]);
        }
      } catch (e) {
        console.error(e);
        setApiMatches(null);
      } finally {
        setLoading(false);
      }
    }

    fetchApiMatches();
    
    return unsub;
  }, [tab]);

  const matches = useMemo(() => {
    let baseList: Match[] = [];
    if (apiMatches && apiMatches.length > 0) {
      baseList = apiMatches;
    } else if (firebaseMatches) {
      baseList = Object.entries(firebaseMatches).map(([id, v]) => ({ ...v, id }));
      baseList.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    }
    
    if (query) {
      return baseList.filter(
        (m) => m.homeTeam.toLowerCase().includes(query) || m.awayTeam.toLowerCase().includes(query) || m.league.toLowerCase().includes(query)
      );
    }
    return baseList;
  }, [apiMatches, firebaseMatches, query]);

  return (
    <Shell>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="breathe" style={{ display: "inline-block", color: "var(--accent)" }}>⚽</span> Football Matches
        </h1>
        <p className="muted" style={{ margin: "0 0 16px 0" }}>Top tier football action.</p>
        <div className="row" style={{ gap: 8, justifyContent: "center" }}>
          <button className={`btn ${tab === "live" ? "" : "btn-ghost"}`} onClick={() => setTab("live")} style={{ borderRadius: 999, padding: "8px 20px" }}>Live</button>
          <button className={`btn ${tab === "today" ? "" : "btn-ghost"}`} onClick={() => setTab("today")} style={{ borderRadius: 999, padding: "8px 20px" }}>Today</button>
          <button className={`btn ${tab === "tomorrow" ? "" : "btn-ghost"}`} onClick={() => setTab("tomorrow")} style={{ borderRadius: 999, padding: "8px 20px" }}>Tomorrow</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading live matches...</div>
      ) : matches.length === 0 ? (
        <div className="alert" style={{ textAlign: "center" }}>No matches found. Admins will update the daily matches soon!</div>
      ) : (
        <div className="grid cols-2" style={{ gap: 20 }}>
          {matches.map((m) => (
            <div key={m.id} className="card" style={{ background: "linear-gradient(135deg, #ffffff, #f0fdf4)", border: "1px solid var(--stroke)", transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer" }}
                 onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(16, 185, 129, 0.2)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow)"; e.currentTarget.style.borderColor = "var(--stroke)"; }}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                
                <div style={{ position: "absolute", top: 12, left: 16, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {m.league}
                </div>
                <div style={{ position: "absolute", top: 12, right: 16 }}>
                  {m.status.includes("Live") ? (
                    <span className="breathe" style={{ background: "rgba(251, 113, 133, 0.2)", color: "var(--danger)", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>{m.status}</span>
                  ) : (
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent)", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{m.time}</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 32, marginBottom: 16 }}>
                  {/* Home Team */}
                  <div 
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, cursor: m.homeTeamId ? "pointer" : "default", transition: "transform 0.2s" }}
                    onClick={(e) => {
                      if (!m.homeTeamId || !m.leagueId || !m.season) return;
                      e.stopPropagation();
                      setActiveTeamDetails({ teamId: m.homeTeamId, fixtureId: m.id, leagueId: m.leagueId, season: m.season, teamName: m.homeTeam, teamLogo: m.homeLogo });
                    }}
                    onMouseEnter={(e) => { if (m.homeTeamId) e.currentTarget.style.transform = "scale(1.1)"; }}
                    onMouseLeave={(e) => { if (m.homeTeamId) e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxShadow: "0 8px 24px rgba(14, 165, 233, 0.15)", marginBottom: 12 }}>
                      <img src={m.homeLogo} alt={m.homeTeam} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontWeight: 700, textAlign: "center", fontSize: 14 }}>{m.homeTeam}</span>
                  </div>

                  {/* VS / Score */}
                  <div style={{ flex: "0 0 70px", textAlign: "center" }}>
                    {m.homeScore !== null && m.awayScore !== null ? (
                      <span style={{ fontWeight: 800, fontSize: 24, color: "var(--accent)", background: "rgba(16,185,129,0.1)", padding: "8px 16px", borderRadius: 12 }}>
                        {m.homeScore} - {m.awayScore}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: 20, color: "var(--muted)", background: "rgba(15, 23, 42, 0.05)", padding: "8px 12px", borderRadius: 12 }}>
                        VS
                      </span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div 
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, cursor: m.awayTeamId ? "pointer" : "default", transition: "transform 0.2s" }}
                    onClick={(e) => {
                      if (!m.awayTeamId || !m.leagueId || !m.season) return;
                      e.stopPropagation();
                      setActiveTeamDetails({ teamId: m.awayTeamId, fixtureId: m.id, leagueId: m.leagueId, season: m.season, teamName: m.awayTeam, teamLogo: m.awayLogo });
                    }}
                    onMouseEnter={(e) => { if (m.awayTeamId) e.currentTarget.style.transform = "scale(1.1)"; }}
                    onMouseLeave={(e) => { if (m.awayTeamId) e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxShadow: "0 8px 24px rgba(14, 165, 233, 0.15)", marginBottom: 12 }}>
                      <img src={m.awayLogo} alt={m.awayTeam} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontWeight: 700, textAlign: "center", fontSize: 14 }}>{m.awayTeam}</span>
                  </div>
                </div>

                <button className="btn" style={{ width: "100%", padding: "10px", fontWeight: 600 }}>View Odds & Premium Tips</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTeamDetails && (
        <TeamDetailsModal 
          {...activeTeamDetails} 
          onClose={() => setActiveTeamDetails(null)} 
        />
      )}
    </Shell>
  );
}
