import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { onValue, push, ref, set, remove } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

type ChatChannel = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
};

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
};

export default function Chat() {
  const { user } = useAuth();
  
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("general");
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage["replyTo"] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [following, setFollowing] = useState<Record<string, boolean>>({});

  // Ensure 'general' channel exists and load all channels
  useEffect(() => {
    const r = ref(db, "chatChannels");
    return onValue(r, (snap) => {
      const data = snap.val() as Record<string, Omit<ChatChannel, "id">> | null;
      let list: ChatChannel[] = [];
      if (data) {
        list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      }
      
      if (!list.find(c => c.id === "general")) {
        list.push({ id: "general", name: "General Chat", createdBy: "system", createdAt: 0 });
      }
      
      list.sort((a, b) => a.createdAt - b.createdAt);
      setChannels(list);
    });
  }, []);

  // Load messages for the active channel
  useEffect(() => {
    if (!activeChannelId) return;
    const r = ref(db, `chatMessages/${activeChannelId}`);
    return onValue(r, (snap) => {
      const data = snap.val() as Record<string, Omit<ChatMessage, "id">> | null;
      if (!data) {
        setMessages([]);
        return;
      }
      const msgs = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
    });
  }, [activeChannelId]);

  // Load following list
  useEffect(() => {
    if (!user) return;
    const r = ref(db, `userFollowing/${user.uid}`);
    return onValue(r, (snap) => {
      setFollowing(snap.val() || {});
    });
  }, [user]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newChannelName.trim()) return;
    try {
      const key = push(ref(db, "chatChannels")).key;
      if (key) {
        await set(ref(db, `chatChannels/${key}`), {
          name: newChannelName.trim(),
          createdBy: user.uid,
          createdAt: Date.now()
        });
        setNewChannelName("");
        setCreatingChannel(false);
        setActiveChannelId(key);
      }
    } catch (err) {
      alert("Failed to create channel");
    }
  }

  async function toggleFollow(targetUserId: string) {
    if (!user || targetUserId === user.uid) return;
    const isFollowing = following[targetUserId];
    const followRef = ref(db, `userFollowing/${user.uid}/${targetUserId}`);
    if (isFollowing) {
      await remove(followRef);
    } else {
      await set(followRef, true);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!text.trim() && !file) || !activeChannelId) return;
    setBusy(true);

    try {
      let imageUrl: string | undefined;

      if (file) {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });
      }

      const key = push(ref(db, `chatMessages/${activeChannelId}`)).key;
      if (!key) throw new Error("No key");

      const msgData: Omit<ChatMessage, "id"> = {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        text: text.trim(),
        createdAt: Date.now(),
      };
      if (imageUrl) msgData.imageUrl = imageUrl;
      if (replyTo) msgData.replyTo = replyTo;

      await set(ref(db, `chatMessages/${activeChannelId}/${key}`), msgData);

      setText("");
      setFile(null);
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <Shell>
        <div className="alert">
          Log in to join the chat and channels. <Link to="/login">Log in</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Community Hub</h1>
          <p className="muted" style={{ margin: 0 }}>Join channels, chat, and follow friends.</p>
        </div>
      </div>

      <style>{`
        .chat-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 16px;
        }
        @media (max-width: 860px) {
          .chat-layout {
            grid-template-columns: 1fr;
          }
          .chat-sidebar {
            height: auto !important;
            max-height: 25vh;
          }
          .chat-main {
            height: 65vh !important;
          }
        }
      `}</style>

      <div className="chat-layout">
        {/* Sidebar */}
        <div className="card chat-sidebar" style={{ height: "70vh", display: "flex", flexDirection: "column" }}>
          <div className="card-body" style={{ flex: 1, overflowY: "auto", padding: "16px 10px" }}>
            <h3 style={{ fontSize: 14, textTransform: "uppercase", color: "var(--muted)", margin: "0 0 12px 6px" }}>Channels</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {channels.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  style={{
                    textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: activeChannelId === c.id ? "rgba(56, 189, 248, 0.15)" : "transparent",
                    color: activeChannelId === c.id ? "var(--text)" : "var(--muted)",
                    fontWeight: activeChannelId === c.id ? 600 : 400,
                    transition: "all 0.2s"
                  }}
                >
                  # {c.name}
                </button>
              ))}
            </div>
            
            <div style={{ marginTop: 24, padding: "0 6px" }}>
              {creatingChannel ? (
                <form onSubmit={handleCreateChannel}>
                  <input 
                    autoFocus
                    className="input" 
                    placeholder="Channel name..." 
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    style={{ marginBottom: 8, padding: "6px 10px", fontSize: 13 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="btn" style={{ padding: "4px 8px", fontSize: 12 }}>Create</button>
                    <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setCreatingChannel(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setCreatingChannel(true)}
                  style={{ background: "transparent", border: "1px dashed var(--stroke)", color: "var(--muted)", width: "100%", padding: 8, borderRadius: 8, cursor: "pointer" }}
                >
                  + New Channel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="card chat-main" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--stroke)", background: "rgba(248, 250, 252, 0.4)" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}># {channels.find(c => c.id === activeChannelId)?.name || "Chat"}</h2>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {messages.length === 0 && <div className="muted" style={{ textAlign: "center", marginTop: 20 }}>No messages in this channel yet.</div>}
            {messages.map((m) => {
              const isMine = m.userId === user.uid;
              const isFollowed = following[m.userId];
              
              return (
                <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textAlign: isMine ? "right" : "left", padding: "0 4px", display: "flex", gap: 8, alignItems: "center", flexDirection: isMine ? "row-reverse" : "row" }}>
                    <span style={{ fontWeight: 600, color: isFollowed ? "var(--accent)" : "inherit" }}>
                      {m.userName} {isFollowed && "★"}
                    </span>
                    <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {!isMine && (
                      <button 
                        onClick={() => toggleFollow(m.userId)} 
                        style={{ background: "transparent", border: "none", color: "var(--accent2)", cursor: "pointer", fontSize: 11, padding: 0 }}
                      >
                        {isFollowed ? "Unfollow" : "Follow"}
                      </button>
                    )}
                  </div>
                  
                  <div 
                    style={{ 
                      background: isMine ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.8)", 
                      border: isMine ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid var(--stroke)",
                      padding: "10px 14px", 
                      borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    }}
                  >
                    {m.replyTo && (
                      <div style={{ background: "rgba(15, 23, 42, 0.2)", padding: "6px 10px", borderRadius: 8, marginBottom: 8, fontSize: 13, borderLeft: "3px solid var(--accent)" }}>
                        <strong style={{ color: "var(--accent)", display: "block" }}>{m.replyTo.userName}</strong>
                        <span className="muted" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.replyTo.text || "Image"}</span>
                      </div>
                    )}
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="attachment" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: m.text ? 8 : 0, maxHeight: 200, objectFit: "contain", display: "block" }} />
                    )}
                    {m.text && <div style={{ wordBreak: "break-word" }}>{m.text}</div>}
                  </div>
                  
                  {!isMine && (
                    <button 
                      onClick={() => setReplyTo({ id: m.id, userName: m.userName, text: m.text })}
                      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", marginTop: 4, padding: "0 4px" }}
                    >
                      Reply
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div style={{ borderTop: "1px solid var(--stroke)", padding: "12px", background: "rgba(248, 250, 252, 0.8)" }}>
            {replyTo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(56, 189, 248, 0.1)", padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Replying to <strong style={{ color: "var(--accent)" }}>{replyTo.userName}</strong>: {replyTo.text || "Image"}
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
              </div>
            )}
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ cursor: "pointer", color: file ? "var(--accent)" : "var(--muted)", padding: "8px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "8px", border: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </label>
              <input 
                className="input" 
                style={{ flex: 1 }} 
                placeholder={`Message #${channels.find(c => c.id === activeChannelId)?.name || ""}`} 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
              />
              <button className="btn breathe" type="submit" disabled={busy || (!text.trim() && !file)}>
                {busy ? "..." : "Send"}
              </button>
            </form>
            {file && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>Attachment: {file.name}</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
