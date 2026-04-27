import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import type { Betslip } from "@/types";
import { Shell } from "@/components/Shell";
import { lastFiveStats } from "@/lib/stats";
import { useCountdown } from "@/hooks/useCountdown";

function CountdownBadge({ expiresAt }: { expiresAt: number }) {
  const cd = useCountdown(expiresAt);
  if (cd.expired) return <span className="pill">Expired</span>;
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

  return (
    <span className="pill breathe" style={{ color, background: bg, borderColor: border, boxShadow: shadow, fontWeight: 800, transition: "all 1s ease", textShadow: "0 1px 4px rgba(15, 23, 42, 0.8)" }}>
      {cd.days}d {String(cd.hours).padStart(2, "0")}:{String(cd.minutes).padStart(2, "0")}:
      {String(cd.seconds).padStart(2, "0")}
    </span>
  );
}

export default function Betslips() {
  const [rows, setRows] = useState<Record<string, Betslip> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, "betslips");
    return onValue(r, (snap) => {
      setRows(snap.val() as Record<string, Betslip> | null);
      setLoading(false);
    });
  }, []);

  const [params] = useSearchParams();
  const query = (params.get("q") || "").toLowerCase();

  const { list, stats } = useMemo(() => {
    const now = Date.now();
    const all = rows
      ? Object.entries(rows).map(([id, v]) => ({ id, ...v }))
      : [];
    let items = all.filter((b) => Number(b.expiresAt) > now);

    if (query) {
      items = items.filter(
        (b) => b.title.toLowerCase().includes(query) || b.company.toLowerCase().includes(query)
      );
    }

    const list = items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return { list, stats: lastFiveStats(rows) };
  }, [rows, query]);

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
      <header className="hero">
        <h5>Premium betslips, unlocked after secure payment.</h5>

      </header>

      <div className="row" style={{ marginBottom: 20, gap: 12 }}>
        <span className="muted" style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 13 }}>Last 5 Results</span>
        <div className="row" style={{ gap: 8 }} aria-label="Last five betslip results">
          {stats.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>No results yet</span>
          ) : (
            stats.map((result, i) => (
              <span key={i} className={`pill ${result === "won" ? "breathe" : ""}`} style={{
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                background: result === "won" ? "rgba(52, 211, 153, 0.2)" : "rgba(251, 113, 133, 0.15)",
                borderColor: result === "won" ? "rgba(52, 211, 153, 0.4)" : "rgba(251, 113, 133, 0.3)",
                color: result === "won" ? "#34d399" : "#fb7185",
                borderRadius: "50%",
                boxShadow: result === "won" ? "0 0 12px rgba(52, 211, 153, 0.3)" : "none"
              }}>
                {result === "won" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="grid cols-3">
        {list.map((b) => (
          <article key={b.id} className="card">
            <div style={{ position: "relative", overflow: "hidden" }}>
              <img className="thumb" src={b.imageUrl} alt="" loading="lazy" style={{ filter: "blur(14px) brightness(0.6)", transform: "scale(1.1)", transition: "all 0.3s ease" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "rgba(248, 250, 252, 0.3)" }}>
                <span className="breathe" style={{ fontSize: 36, filter: "drop-shadow(0 2px 8px rgba(15, 23, 42, 0.8))", display: "inline-block" }}>🔒</span>
                <span className="breathe" style={{ fontWeight: 700, marginTop: 8, color: "#0f172a", textShadow: "0 2px 8px rgba(15, 23, 42, 0.8)", letterSpacing: "0.05em", display: "inline-block" }}>PREMIUM BETSLIP</span>
              </div>
            </div>
            <div className="card-body">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="badge">
                  <strong>{b.company}</strong>
                </span>
                <CountdownBadge expiresAt={Number(b.expiresAt)} />
              </div>
              <h3 style={{ marginTop: 12 }}>{b.title}</h3>
              <p className="muted" style={{ margin: "8px 0 14px" }}>
                Expires {new Date(Number(b.expiresAt)).toLocaleString()}
              </p>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="pill">
                  {b.cost} {b.currency}
                </span>
                <Link className="btn" to={`/slip/${b.id}`}>
                  View
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!list.length && <p className="muted">No active betslips right now. Check back soon.</p>}
    </Shell>
  );
}
