import React, { useState, useEffect, useRef, useCallback } from "react";
import { Messages } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : "";
const init = (name) => name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";

export default function AdminMessaging() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await Messages.conversations();
      setConversations(data?.conversations || []);
    } catch (err) {
      console.error("Erreur conversations:", err.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const data = await Messages.get(conv.id);
      setMessages(data?.messages || []);
      await Messages.markRead(conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error("Erreur messages:", err.message);
      setMessages([]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConv]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeConv) return;
    setSending(true);
    try {
      const sent = await Messages.send(activeConv.id, text);
      setMessages(prev => [...prev, sent]);
      setInput("");
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, updatedAt: new Date().toISOString() } : c));
    } catch (err) {
      console.error("Erreur envoi:", err.message);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filtered = conversations.filter(c =>
    !search ||
    c.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vendor?.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Messagerie</h1>
          <p className="text-sm mt-0.5 text-gray-400">Conversations avec les vendeurs</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-500/20">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
        {/* Liste conversations */}
        <div className="w-full sm:w-80 lg:w-96 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un vendeur..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {search ? "Aucun résultat" : "Aucune conversation pour le moment"}
              </div>
            ) : filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 text-left transition-colors hover:bg-slate-800/30 ${activeConv?.id === conv.id ? "bg-blue-500/10" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${conv.vendor?.active !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-gray-400"}`}>
                  {init(conv.vendor?.name || conv.vendor?.shop_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">{conv.vendor?.shop_name || conv.vendor?.name || "Vendeur"}</p>
                    <span className="text-[10px] text-gray-500 shrink-0">{conv.updatedAt ? fmtDateTime(conv.updatedAt) : ""}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{conv.subject || "Support"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-gray-500 truncate">{conv.messages?.[0]?.content || "Nouvelle conversation"}</p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold shrink-0">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fil discussion */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl">💬</div>
              <h3 className="text-sm font-semibold text-slate-300">Sélectionnez une conversation</h3>
              <p className="text-xs text-gray-500 max-w-xs">Choisissez une conversation à gauche pour consulter les messages et répondre aux vendeurs.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/50">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${activeConv.vendor?.active !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-gray-400"}`}>
                    {init(activeConv.vendor?.name || activeConv.vendor?.shop_name)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{activeConv.vendor?.shop_name || activeConv.vendor?.name || "Vendeur"}</p>
                  <p className="text-xs text-gray-500 truncate">{activeConv.subject || "Support"} · {activeConv.vendor?.phone || ""}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-950/50">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-10">Aucun message. Écrivez le premier message.</div>
                ) : messages.map(msg => {
                  const isAdmin = msg.senderId === profile?.id;
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] ${isAdmin ? "text-right" : ""}`}>
                        <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAdmin ? "bg-blue-600 text-white rounded-br-md" : "bg-slate-800 text-gray-200 border border-slate-700 rounded-bl-md"}`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-gray-500 mt-1 ${isAdmin ? "text-right" : ""}`}>
                          {fmtTime(msg.createdAt)}
                          {isAdmin && msg.isRead && <span className="ml-1 text-blue-400">✓✓</span>}
                          {isAdmin && !msg.isRead && <span className="ml-1 text-gray-600">✓</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-slate-800 bg-slate-900">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrivez votre réponse..."
                    rows={1}
                    className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    style={{ minHeight: 44, maxHeight: 120 }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 22-7z" /></svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] mt-2 text-center text-gray-500">Entrée pour envoyer · Shift+Entrée pour une nouvelle ligne</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}