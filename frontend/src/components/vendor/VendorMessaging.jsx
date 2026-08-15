import React, { useState, useEffect, useRef, useCallback } from "react";
import { Messages } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : "";
const init = (name) => name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";

export default function VendorMessaging({ dark }) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [starting, setStarting] = useState(false);
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

  const startConversation = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setStarting(true);
    try {
      const result = await Messages.start(newSubject.trim(), newMessage.trim());
      setShowNewConv(false);
      setNewSubject("");
      setNewMessage("");
      await loadConversations();
      if (result?.conversation) {
        await openConversation(result.conversation);
      }
    } catch (err) {
      console.error("Erreur démarrage:", err.message);
      alert(err.message);
    } finally {
      setStarting(false);
    }
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Messagerie Support</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Discutez avec l'équipe SoubreMarket</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewConv(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouvelle conversation
          </button>
          {totalUnread > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden flex ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`} style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
        {/* Liste conversations */}
        <div className={`w-full sm:w-72 lg:w-80 border-r flex flex-col shrink-0 ${dark ? "border-slate-800" : "border-gray-100"}`}>
          <div className={`p-3 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
            <input
              value={""}
              onChange={() => {}}
              placeholder="Rechercher..."
              className={`${inputCls} opacity-60`}
              disabled
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className={`p-6 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Chargement...</div>
            ) : conversations.length === 0 ? (
              <div className={`p-6 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                Aucune conversation. Cliquez sur "Nouvelle conversation" pour contacter le support.
              </div>
            ) : conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b text-left transition-colors ${dark ? "border-slate-800/50 hover:bg-slate-800/30" : "border-gray-50 hover:bg-gray-50/50"} ${activeConv?.id === conv.id ? (dark ? "bg-emerald-500/10" : "bg-emerald-50") : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                  {init(conv.admin?.name || "SM")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-800"}`}>
                      {conv.admin?.name || "Support Admin"}
                    </p>
                    <span className={`text-[10px] shrink-0 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {conv.updatedAt ? fmtDateTime(conv.updatedAt) : ""}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{conv.subject || "Support"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-[11px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {conv.messages?.[0]?.content || "Nouvelle conversation"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">{conv.unreadCount}</span>
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
            <div className={`flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 ${dark ? "bg-slate-950/50" : "bg-gray-50/30"}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${dark ? "bg-slate-800" : "bg-gray-100"}`}>💬</div>
              <h3 className={`text-sm font-semibold ${dark ? "text-slate-300" : "text-gray-700"}`}>Sélectionnez une conversation</h3>
              <p className={`text-xs max-w-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Choisissez une conversation à gauche ou démarrez-en une nouvelle pour contacter le support.</p>
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${dark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${dark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                    {init(activeConv.admin?.name || "SM")}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>
                    {activeConv.admin?.name || "Support Admin"}
                  </p>
                  <p className={`text-xs truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {activeConv.subject || "Support"} · Réponse en ~5 min
                  </p>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${dark ? "bg-slate-950/50" : "bg-gray-50/30"}`}>
                {messages.length === 0 ? (
                  <div className={`text-center text-sm py-10 ${dark ? "text-gray-500" : "text-gray-400"}`}>Aucun message. Écrivez le premier message.</div>
                ) : messages.map(msg => {
                  const isSeller = msg.senderId === profile?.id;
                  return (
                    <div key={msg.id} className={`flex ${isSeller ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] ${isSeller ? "text-right" : ""}`}>
                        <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isSeller
                            ? "bg-indigo-600 text-white rounded-br-md"
                            : dark ? "bg-slate-800 text-gray-200 border border-slate-700 rounded-bl-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-gray-400 mt-1 ${isSeller ? "text-right" : ""}`}>
                          {fmtTime(msg.createdAt)}
                          {isSeller && msg.isRead && <span className="ml-1 text-blue-400">✓✓</span>}
                          {isSeller && !msg.isRead && <span className="ml-1 text-gray-500">✓</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={`px-4 py-3 border-t ${dark ? "border-slate-800 bg-slate-900" : "border-gray-100 bg-white"}`}>
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrivez votre message..."
                    rows={1}
                    className={`flex-1 resize-none border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`}
                    style={{ minHeight: 44, maxHeight: 120 }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 22-7z" /></svg>
                    )}
                  </button>
                </div>
                <p className={`text-[10px] mt-2 text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>Entrée pour envoyer · Support disponible 7j/7</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowNewConv(false)}>
          <div className={`rounded-2xl w-full max-w-md shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <div>
                <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Nouvelle conversation</h3>
                <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Contactez l'équipe SoubreMarket</p>
              </div>
              <button onClick={() => setShowNewConv(false)} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Sujet *</label>
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Ex: Question sur mes commissions"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Message *</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  rows={4}
                  placeholder="Décrivez votre demande..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={startConversation}
                  disabled={!newSubject.trim() || !newMessage.trim() || starting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {starting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {starting ? "Envoi..." : "Démarrer la conversation"}
                </button>
                <button
                  onClick={() => setShowNewConv(false)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}