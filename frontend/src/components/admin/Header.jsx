/**
 * Header — Barre supérieure du dashboard superadmin.
 * Contient : toggle mobile, recherche globale, notifications (données réelles), période.
 * Les notifications proviennent de la base de données via l'API /admin/notifications.
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Admin } from "../../api/client";

const PERIODS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "year", label: "Cette année" },
];

const NOTIF_ICONS = {
  system: "🔔",
  success: "✅",
  warning: "⚠️",
  danger: "❌",
  info: "ℹ️",
};

const fmtTimeAgo = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH} h`;
  if (diffD < 7) return `Il y a ${diffD} jour${diffD > 1 ? "s" : ""}`;
  return d.toLocaleDateString("fr-FR");
};

export default function Header({ onMenuClick, period, onPeriodChange }) {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const notifRef = useRef(null);
  const periodRef = useRef(null);
  const email = profile?.email || "admin@soubremarket.com";
  const name = profile?.name || "Super Admin";
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  const fetchNotifications = () => {
    setNotifLoading(true);
    Admin.notifications()
      .then(res => {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    // Polling toutes les 60 secondes
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    // Rediriger vers la page la plus pertinente selon le rôle
    if (profile?.type === "superadmin") {
      navigate(`/superadmin/produits?q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/admin/produits?q=${encodeURIComponent(q)}`);
    }
  };

  const currentPeriod = PERIODS.find(p => p.key === period) || PERIODS[0];

  const markAllRead = () => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center gap-3 px-4 sm:px-6 shrink-0 sticky top-0 z-30">
      {/* Burger mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 transition-colors"
        aria-label="Ouvrir le menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <div className="hidden md:block">
        <h1 className="text-sm font-bold text-slate-50 leading-tight">Back-office Admin</h1>
        <p className="text-[10px] text-gray-400">Pilotage centralisé de la plateforme</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md ml-2 lg:ml-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher vendeurs, produits, transactions..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              aria-label="Effacer"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Sélecteur de période */}
        <div className="relative hidden sm:block" ref={periodRef}>
          <button
            onClick={() => setPeriodOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span>📅</span>
            <span className="hidden md:inline">{currentPeriod.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${periodOpen ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {periodOpen && (
            <div className="absolute right-0 top-11 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1.5 z-50">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { onPeriodChange(p.key); setPeriodOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700/70 transition-colors ${period === p.key ? "text-emerald-400 font-semibold" : "text-slate-200"}`}
                >
                  {p.label}
                  {period === p.key && <span className="ml-2">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 max-w-[85vw] bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <p className="text-sm font-semibold text-slate-100">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifLoading ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-xs">
                    Chargement des notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-xs">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors cursor-pointer border-b border-slate-700/50 ${
                        n.type === "danger" ? "bg-red-500/5" : ""
                      } ${!n.read ? "bg-slate-800/40" : ""}`}
                    >
                      <span className="text-lg shrink-0">{NOTIF_ICONS[n.type] || "🔔"}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-200 leading-snug">{n.title || n.message}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{fmtTimeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => { setNotifOpen(false); navigate("/superadmin/moderation"); }}
                className="w-full py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                Voir toutes les notifications →
              </button>
            </div>
          )}
        </div>

        {/* Email admin */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[9px] font-bold text-white">
            {initials}
          </div>
          <span className="text-xs text-slate-300 truncate max-w-36">{email}</span>
        </div>

        {/* Déconnexion */}
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 items-center justify-center text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}