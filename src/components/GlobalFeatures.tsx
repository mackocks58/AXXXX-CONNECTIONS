import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Link } from "react-router-dom";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1535016120720-40c646bebbbb?auto=format&fit=crop&q=80&w=2000"
];

const DEFAULT_ADS = [
  { title: "Connection Za Bongo", caption: "🔥 Trending Videos!", text: "The most trending bongo connections and dramas. Unlock now!", link: "/movies/connection-bongo", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000" },
  { title: "Bongo Wiki Hii", caption: "🔥 New Releases!", text: "New Tanzanian videos released this week.", link: "/movies/bongo-wiki-hii", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000" },
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

  // Fetch Movie Groups for Ads
  useEffect(() => {
    onValue(ref(db, "movieGroups"), (snap) => {
      const fbGroups = snap.val();
      if (fbGroups) {
        const groupsArr = Object.entries(fbGroups).map(([id, v]: any) => ({ ...v, id }));
        if (groupsArr.length > 0) {
          const formattedAds = groupsArr.map(group => ({
            title: group.name,
            caption: "🔥 Premium Videos!",
            text: group.description || "Unlock exclusive video connections instantly.",
            link: `/movies/${group.id}`,
            image: group.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000",
          }));
          setAdsPool(formattedAds);
        }
      }
    }, { onlyOnce: true });
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
                <img src={currentAd.image} alt={currentAd.title} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: "10px 10px 0 0", margin: "-16px -16px 16px", maxWidth: "none" }} />
              </div>
              <div style={{ padding: "0 4px" }}>
                <span className="badge breathe" style={{ marginBottom: 10, background: "rgba(251, 113, 133, 0.2)", color: "var(--danger)", borderColor: "rgba(251, 113, 133, 0.4)" }}>{currentAd.caption}</span>
                <h3 style={{ color: "var(--text)" }}>{currentAd.title}</h3>
                <p style={{ margin: "10px 0 20px" }}>{currentAd.text}</p>
                <Link to={currentAd.link} className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }} onClick={() => setShowAd(false)}>
                  Unlock Videos Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
