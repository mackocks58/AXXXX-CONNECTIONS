import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516477028120-e79e6bd4b6e8?q=80&w=2000&auto=format&fit=crop"
];

const DEFAULT_ADS = [
  { title: "Special Offer!", caption: "Welcome Bonus", text: "Get 50% off on your first betslip. Register today!", link: "/register", image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=400&auto=format&fit=crop" },
  { title: "Don't Miss Out!", caption: "Weekend Picks", text: "Check out the latest premium picks for this weekend.", link: "/", image: "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=400&auto=format&fit=crop" },
  { title: "Boost Your Odds!", caption: "VIP Channel", text: "Subscribe to our VIP channel for guaranteed results.", link: "/support", image: "https://images.unsplash.com/photo-1516477028120-e79e6bd4b6e8?q=80&w=400&auto=format&fit=crop" },
  { title: "Huge Jackpots!", caption: "Win Big", text: "New high-stakes slips available now. Secure your spot.", link: "/", image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=400&auto=format&fit=crop" },
];

export function GlobalFeatures() {
  const [bgIndex, setBgIndex] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [adsPool, setAdsPool] = useState(DEFAULT_ADS);
  const [currentAd, setCurrentAd] = useState(DEFAULT_ADS[0]);

  // Handle sliding background images
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  // Fetch upcoming matches for Ads
  useEffect(() => {
    async function fetchMatchAds() {
      try {
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

        const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${tomorrowStr}`, {
          headers: { 'x-apisports-key': '5c7ec841c0b922b7deaf823b8880a068' }
        });
        const data = await res.json();

        let topMatchAd = null;
        if (data.response && data.response.length > 0) {
          const topLeagues = [39, 140, 135, 78, 61, 2, 3];
          let filtered = data.response.filter((m: any) => topLeagues.includes(m.league.id));
          if (filtered.length > 0) {
            const m = filtered[0];
            topMatchAd = {
              title: `${m.teams.home.name} vs ${m.teams.away.name}`,
              caption: "🔥 Upcoming Match!",
              text: `Don't miss the upcoming action in ${m.league.name}! Get the best odds and premium tips now.`,
              link: "/",
              image: "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=400&auto=format&fit=crop",
              homeLogo: m.teams.home.logo,
              awayLogo: m.teams.away.logo
            };
          }
        }

        if (topMatchAd) {
          setAdsPool((prev) => [...prev, topMatchAd]);
        } else {
          // Fallback to Firebase
          onValue(ref(db, "matches"), (snap) => {
            const fbMatches = snap.val();
            if (fbMatches) {
              const matchesArr = Object.values(fbMatches) as any[];
              const upcoming = matchesArr.find(m => m.status === "Upcoming");
              if (upcoming) {
                setAdsPool((prev) => [...prev, {
                  title: `${upcoming.homeTeam} vs ${upcoming.awayTeam}`,
                  caption: "🔥 Upcoming Match!",
                  text: `Don't miss the action in ${upcoming.league}. Get the premium betslips now!`,
                  link: "/",
                  image: "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=400&auto=format&fit=crop",
                  homeLogo: upcoming.homeLogo,
                  awayLogo: upcoming.awayLogo
                }]);
              }
            }
          }, { onlyOnce: true });
        }
      } catch (e) {
        console.error("Failed to load match ad", e);
      }
    }
    fetchMatchAds();
  }, []);

  // Handle random pop-up ads
  useEffect(() => {
    const scheduleNextAd = () => {
      const nextDelay = 180000; // 3 minutes
      return setTimeout(() => {
        const randomAd = adsPool[Math.floor(Math.random() * adsPool.length)];
        setCurrentAd(randomAd);
        setShowAd(true);
      }, nextDelay);
    };

    let timerId = scheduleNextAd();
    return () => clearTimeout(timerId);
  }, [showAd, adsPool]);

  return (
    <>
      <div 
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1,
          backgroundImage: `url(${BACKGROUND_IMAGES[bgIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 1s ease-in-out",
          opacity: 0.15,
          pointerEvents: "none"
        }}
      />

      {showAd && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          background: "rgba(248, 250, 252, 0.8)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div className="card" style={{ maxWidth: 400, margin: 20, position: "relative" }}>
            <div className="card-body">
              <button 
                onClick={() => setShowAd(false)}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(15, 23, 42, 0.5)", borderRadius: "50%", border: "none", color: "#0f172a", cursor: "pointer", fontSize: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
                }}
              >
                &times;
              </button>
              <div style={{ position: "relative" }}>
                <img src={currentAd.image} alt={currentAd.title} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: "10px 10px 0 0", margin: "-16px -16px 16px", width: "calc(100% + 32px)", maxWidth: "none" }} />
                
                {/* Overlay logos if they exist */}
                {(currentAd as any).homeLogo && (currentAd as any).awayLogo && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 16, background: "rgba(248, 250, 252, 0.7)", padding: "12px 24px", borderRadius: 999, backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(15, 23, 42, 0.5)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                      <img src={(currentAd as any).homeLogo} alt="Home" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>VS</span>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                      <img src={(currentAd as any).awayLogo} alt="Away" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: "0 4px" }}>
                <span className="badge breathe" style={{ marginBottom: 10, background: "rgba(251, 113, 133, 0.2)", color: "var(--danger)", borderColor: "rgba(251, 113, 133, 0.4)" }}>{currentAd.caption}</span>
                <h3 style={{ color: "var(--text)" }}>{currentAd.title}</h3>
                <p style={{ margin: "10px 0 20px" }}>{currentAd.text}</p>
                <a href={currentAd.link} className="btn" style={{ display: "block", textAlign: "center" }} onClick={() => setShowAd(false)}>
                  Bet Now & Get Tips
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
