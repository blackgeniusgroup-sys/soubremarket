import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Palette, Store, Package, ShoppingCart,
  Star, TrendingUp, TrendingDown, Send, Paperclip, Image, Upload, X,
  Menu, LogOut, ChevronRight, Clock, CheckCircle2, XCircle, Truck,
  DollarSign, Users, Settings, Home, Bell, Search, Plus, Eye, EyeOff,
  Sun, Moon, Pencil, Trash2, User, Phone, MapPin, Megaphone, Tag,
  Sparkles, Filter, RefreshCw, Check, AlertCircle, Loader2, Camera
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useProducts } from "../../hooks/useProducts";
import { LineChart } from "../../components/admin/Charts";
import VendorMessaging from "../../components/vendor/VendorMessaging";
import { Orders, Products, Vendor } from "../../api/client";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";
const fmtNum = (n) => (Number(n) || 0).toLocaleString("fr-FR");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const init = (name) => name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";

const STATUS_MAP = {
  pending:    { label: "En cours",   cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  assigned:   { label: "Assignée",   cls: "bg-sky-50 text-sky-700 border-sky-200", icon: Truck },
  picked:     { label: "Préparée",   cls: "bg-violet-50 text-violet-700 border-violet-200", icon: Package },
  delivering: { label: "En livraison", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck },
  delivered:  { label: "Expédiée",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled:  { label: "Annulée",    cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

const FONT_OPTIONS = [
  { value: "sans", label: "Sans-serif", css: "'Inter', system-ui, sans-serif" },
  { value: "serif", label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { value: "mono", label: "Monospace", css: "'Courier New', monospace" },
];

// Catégories avec emoji automatique
const CATEGORIES = [
  { value: "alimentation", label: "Alimentation", emoji: "🍎" },
  { value: "vetements", label: "Vêtements", emoji: "👕" },
  { value: "electronique", label: "Électronique", emoji: "📱" },
  { value: "maison", label: "Maison", emoji: "🏠" },
  { value: "beaute", label: "Beauté", emoji: "💄" },
  { value: "autres", label: "Autres", emoji: "📦" },
];

const getCategoryEmoji = (cat) => CATEGORIES.find(c => c.value === cat)?.emoji || "📦";

/* ═══════════════════════════════════════════════════════════
   CONTEXTE THÈME
   ═══════════════════════════════════════════════════════════ */
const ThemeContext = React.createContext({ dark: false, toggle: () => {} });
const useTheme = () => React.useContext(ThemeContext);

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : CARTE KPI
   ═══════════════════════════════════════════════════════════ */
function KpiCard({ icon: Icon, label, value, trend, trendLabel, accent = "emerald", dark }) {
  const accentMap = {
    emerald: dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100",
    amber: dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-100",
    violet: dark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-100",
  };
  const positive = trend >= 0;
  return (
    <div className={`rounded-2xl border p-5 transition-all ${dark ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-gray-100 shadow-sm hover:shadow-md"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${accentMap[accent]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${positive ? (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600") : (dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>{value}</p>
      <p className={`text-xs mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
      {trendLabel && <p className={`text-[10px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>{trendLabel}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : BADGE STATUT
   ═══════════════════════════════════════════════════════════ */
function StatusPill({ status }) {
  const preset = STATUS_MAP[status] || { label: status || "—", cls: "bg-gray-50 text-gray-600 border-gray-200", icon: Package };
  const Icon = preset.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${preset.cls}`}>
      <Icon size={12} />
      {preset.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : TOAST
   ═══════════════════════════════════════════════════════════ */
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2 text-sm font-medium animate-slide-in ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
    }`}>
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE A : TABLEAU DE BORD
   ═══════════════════════════════════════════════════════════ */
function DashboardModule({ orders, products, loading, dark }) {
  const { profile } = useAuth();
  const shopName = profile?.shopName || profile?.name || "Ma Boutique";

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (o.total || 0), 0), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === "pending" || o.status === "assigned").length, [orders]);
  const activeProducts = useMemo(() => products.filter(p => p.active !== false).length, [products]);
  const avgRating = useMemo(() => {
    const rated = products.filter(p => p.rating > 0);
    if (!rated.length) return 4.8;
    return (rated.reduce((s, p) => s + Number(p.rating), 0) / rated.length).toFixed(1);
  }, [products]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));
      const dayOrders = orders.filter(o => {
        const created = new Date(o.createdAt || o.created_at);
        return created >= dayStart && created <= dayEnd;
      });
      const total = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
      days.push({
        label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
        value: total,
      });
    }
    return days;
  }, [orders]);

  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)).slice(0, 8), [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Tableau de bord</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Bienvenue, {profile?.name || "Vendeur"} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Boutique active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard dark={dark} icon={DollarSign} label="Ventes totales" value={fmtFCFA(totalRevenue)} trend={5.2} trendLabel="vs mois précédent" accent="emerald" />
        <KpiCard dark={dark} icon={ShoppingCart} label="Commandes en attente" value={pendingOrders} trend={-2.1} trendLabel="vs semaine dernière" accent="amber" />
        <KpiCard dark={dark} icon={Package} label="Produits actifs" value={activeProducts} trend={3.4} trendLabel="vs mois dernier" accent="blue" />
        <KpiCard dark={dark} icon={Star} label="Note vendeur" value={`${avgRating}/5`} trend={0.3} trendLabel="Basée sur les avis" accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border p-5 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>Revenus — 7 derniers jours</h2>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Évolution des ventes quotidiennes</p>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+{fmtFCFA(chartData.reduce((s, d) => s + d.value, 0))}</span>
          </div>
          <div className="h-52">
            <LineChart data={chartData} height={200} color="#1D9E75" />
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <h2 className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>Aperçu rapide</h2>
          <div className="space-y-3">
            <div className={`flex items-center justify-between py-2 border-b ${dark ? "border-slate-800" : "border-gray-50"}`}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ShoppingCart size={16} className="text-emerald-600" /></span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>Commandes totales</span>
              </div>
              <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{orders.length}</span>
            </div>
            <div className={`flex items-center justify-between py-2 border-b ${dark ? "border-slate-800" : "border-gray-50"}`}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Package size={16} className="text-blue-600" /></span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>Produits publiés</span>
              </div>
              <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{products.length}</span>
            </div>
            <div className={`flex items-center justify-between py-2 border-b ${dark ? "border-slate-800" : "border-gray-50"}`}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Clock size={16} className="text-amber-600" /></span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>En attente</span>
              </div>
              <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{pendingOrders}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><Star size={16} className="text-violet-600" /></span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>Note moyenne</span>
              </div>
              <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{avgRating}/5</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
          <div>
            <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>Commandes récentes</h2>
            <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Les dernières commandes de votre boutique</p>
          </div>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{recentOrders.length} affichées</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wider border-b ${dark ? "text-gray-500 border-slate-800" : "text-gray-400 border-gray-100"}`}>
                <th className="px-5 py-3 font-medium">Commande</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className={`px-5 py-10 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {loading ? "Chargement des commandes..." : "Aucune commande pour le moment. Vos commandes apparaîtront ici."}
                  </td>
                </tr>
              ) : recentOrders.map(o => (
                <tr key={o.id} className={`border-b last:border-0 transition-colors ${dark ? "border-slate-800/50 hover:bg-slate-800/30" : "border-gray-50 hover:bg-gray-50/50"}`}>
                  <td className="px-5 py-3.5">
                    <span className={`font-mono text-xs font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>{o.orderNumber || o.order_number || o.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${dark ? "bg-slate-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                        {init(o.client?.name)}
                      </div>
                      <span className={dark ? "text-gray-300" : "text-gray-700"}>{o.client?.name || "Client"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5"><StatusPill status={o.status} /></td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>{fmtDate(o.createdAt || o.created_at)}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE B : MESSAGERIE SUPPORT
   ═══════════════════════════════════════════════════════════ */
function SupportModule({ dark }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "admin",
      text: "Bonjour ! 👋 Bienvenue sur SoubreMarket. Comment pouvons-nous vous aider aujourd'hui ?",
      time: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 2,
      from: "seller",
      text: "Bonjour, j'aimerais savoir comment modifier le prix de mes produits en masse ?",
      time: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 3,
      from: "admin",
      text: "Bonne question ! Pour l'instant, vous pouvez modifier chaque produit individuellement depuis la page « Publier ». Une fonctionnalité de modification en masse est prévue prochainement. 😊",
      time: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      from: "seller",
      text,
      time: new Date().toISOString(),
    }]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Messagerie Support</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Discutez avec l'équipe SoubreMarket</p>
      </div>

      <div className={`rounded-2xl border overflow-hidden flex flex-col ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`} style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${dark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
              SM
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Support Admin</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              En ligne
            </p>
          </div>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Réponse en ~5 min</span>
        </div>

        <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${dark ? "bg-slate-950/50" : "bg-gray-50/30"}`}>
          {messages.map(msg => {
            const isSeller = msg.from === "seller";
            return (
              <div key={msg.id} className={`flex ${isSeller ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${isSeller ? "text-right" : ""}`}>
                  <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isSeller
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : dark ? "bg-slate-800 text-gray-200 border border-slate-700 rounded-bl-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${isSeller ? "text-right" : ""}`}>
                    {fmtTime(msg.time)}
                  </p>
                </div>
              </div>
            );
          })}
          {attachment && (
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-indigo-50 border border-indigo-100 rounded-2xl rounded-br-md px-4 py-2.5 flex items-center gap-2">
                <Paperclip size={14} className="text-indigo-600" />
                <span className="text-sm text-indigo-700 truncate">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-indigo-400 hover:text-indigo-600">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`px-4 py-3 border-t ${dark ? "border-slate-800 bg-slate-900" : "border-gray-100 bg-white"}`}>
          <div className="flex items-end gap-2">
            <label className="shrink-0 cursor-pointer">
              <input type="file" className="hidden" onChange={handleFile} />
              <span className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${dark ? "border-slate-700 text-gray-500 hover:text-gray-300 hover:border-slate-600" : "border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}>
                <Paperclip size={18} />
              </span>
            </label>
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
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <p className={`text-[10px] mt-2 text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>Appuyez sur Entrée pour envoyer · Support disponible 7j/7</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE C : GESTION DES ARTICLES (CRUD)
   ═══════════════════════════════════════════════════════════ */
function ProductsModule({ products, setProducts, dark, showToast }) {
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || p.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [products, search, filterCat]);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setModal(prev => ({ ...prev, image_base64: ev.target.result.split(",")[1], image_name: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    if (!modal?.name || !modal?.price) {
      showToast("Nom et prix sont obligatoires", "error");
      return;
    }
    setLoading(true);
    try {
      let imageUrl = modal.image_url;
      if (modal.image_base64) {
        const upload = await Vendor.upload({
          file_base64: modal.image_base64,
          file_name: modal.image_name || "product.png",
          folder: "products",
        });
        imageUrl = upload.url;
      }

      const data = {
        name: modal.name,
        description: modal.description || "",
        price: Number(modal.price),
        stock: Number(modal.stock || 0),
        category: modal.category,
        emoji: getCategoryEmoji(modal.category),
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };

      if (modal.id) {
        const updated = await Products.update(modal.id, data);
        setProducts(prev => prev.map(p => p.id === modal.id ? { ...p, ...updated } : p));
        showToast("Produit modifié avec succès ✅");
      } else {
        const created = await Products.create(data);
        setProducts(prev => [created, ...prev]);
        showToast("Produit publié avec succès ✅");
      }
      setModal(null);
      setImagePreview(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      const updated = await Products.update(p.id, { active: !p.active });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, ...updated } : x));
      showToast(p.active ? "Produit désactivé" : "Produit activé ✅");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteProduct = async (p) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await Products.update(p.id, { active: false });
      setProducts(prev => prev.filter(x => x.id !== p.id));
      showToast("Produit supprimé");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Mes articles</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Gérez vos produits, images et stocks</p>
        </div>
        <button
          onClick={() => { setModal({ name: "", description: "", price: "", stock: "", category: "alimentation" }); setImagePreview(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nouvel article
        </button>
      </div>

      {/* Filtres */}
      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="flex-1 relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`${inputCls} sm:w-48`}>
          <option value="all">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
      </div>

      {/* Liste produits */}
      <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wider border-b ${dark ? "text-gray-500 border-slate-800" : "text-gray-400 border-gray-100"}`}>
                <th className="px-5 py-3 font-medium">Article</th>
                <th className="px-3 py-3 font-medium">Catégorie</th>
                <th className="px-3 py-3 font-medium">Prix</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-5 py-10 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    Aucun article trouvé. Cliquez sur "Nouvel article" pour commencer.
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`border-b last:border-0 transition-colors ${dark ? "border-slate-800/50 hover:bg-slate-800/30" : "border-gray-50 hover:bg-gray-50/50"}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">{p.emoji || "📦"}</span>
                      )}
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${dark ? "text-white" : "text-gray-800"}`}>{p.name}</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>{p.description?.slice(0, 40) || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <span className="inline-flex items-center gap-1">
                      <span>{getCategoryEmoji(p.category)}</span>
                      {CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                    </span>
                  </td>
                  <td className={`px-3 py-3.5 font-medium ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(p.price)}</td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <span className={p.stock <= 5 ? "text-red-500 font-medium" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      p.active !== false
                        ? dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : dark ? "bg-gray-500/10 text-gray-400 border-gray-500/20" : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}>
                      {p.active !== false ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {p.active !== false ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => { setModal(p); setImagePreview(p.image_url || null); }}
                        className={`p-2 rounded-lg border transition-colors ${dark ? "border-slate-700 text-blue-400 hover:bg-blue-500/10" : "border-gray-200 text-blue-600 hover:bg-blue-50"}`}
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className={`p-2 rounded-lg border transition-colors ${dark ? "border-slate-700 text-amber-400 hover:bg-amber-500/10" : "border-gray-200 text-amber-600 hover:bg-amber-50"}`}
                        title={p.active !== false ? "Désactiver" : "Activer"}
                      >
                        {p.active !== false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => deleteProduct(p)}
                        className={`p-2 rounded-lg border transition-colors ${dark ? "border-slate-700 text-red-400 hover:bg-red-500/10" : "border-gray-200 text-red-600 hover:bg-red-50"}`}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal produit */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => { setModal(null); setImagePreview(null); }}>
          <div className={`rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{modal.id ? "Modifier l'article" : "Nouvel article"}</h3>
              <button onClick={() => { setModal(null); setImagePreview(null); }} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image */}
              <div>
                <label className={labelCls}>Image de l'article</label>
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dark ? "border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/5" : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30"}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu" className="h-28 w-full object-contain" />
                  ) : (
                    <>
                      <Camera size={24} className={`mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`} />
                      <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Cliquez pour ajouter une image</span>
                      <span className={`text-[10px] mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>PNG, JPG — max 5 Mo</span>
                    </>
                  )}
                </label>
              </div>

              <div>
                <label className={labelCls}>Nom de l'article *</label>
                <input value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="Ex: Tomates fraîches" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea value={modal.description || ""} onChange={e => setModal({ ...modal, description: e.target.value })} rows={3} placeholder="Décrivez votre produit..." className={`${inputCls} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prix (F CFA) *</label>
                  <input type="number" value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Stock *</label>
                  <input type="number" value={modal.stock} onChange={e => setModal({ ...modal, stock: e.target.value })} placeholder="0" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Catégorie (l'icône est automatique)</label>
                <select value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
                <p className={`text-[10px] mt-1 flex items-center gap-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  <Sparkles size={10} />
                  Icône : {getCategoryEmoji(modal.category)} — sélectionnée automatiquement
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveProduct}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Enregistrement..." : modal.id ? "Enregistrer les modifications" : "Publier l'article"}
                </button>
                <button
                  onClick={() => { setModal(null); setImagePreview(null); }}
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

/* ═══════════════════════════════════════════════════════════
   MODULE D : GESTION DES CLIENTS + NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
function ClientsModule({ dark, showToast }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [notifModal, setNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: "", message: "", type: "promo" });
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Vendor.clients();
      setClients(data.clients || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = useMemo(() => {
    return clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  }, [clients, search]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.user_id)));
  };

  const sendNotification = async () => {
    if (selected.size === 0) {
      showToast("Sélectionnez au moins un client", "error");
      return;
    }
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      showToast("Titre et message sont obligatoires", "error");
      return;
    }
    setSending(true);
    try {
      await Vendor.notify({
        client_ids: [...selected],
        title: notifForm.title,
        message: notifForm.message,
        type: notifForm.type,
      });
      showToast(`Notification envoyée à ${selected.size} client(s) ✅`);
      setNotifModal(false);
      setNotifForm({ title: "", message: "", type: "promo" });
      setSelected(new Set());
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Mes clients</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Gérez vos clients et envoyez des notifications</p>
        </div>
        <button
          onClick={() => setNotifModal(true)}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Megaphone size={16} />
          Envoyer une notification ({selected.size})
        </button>
      </div>

      {/* Filtres */}
      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="flex-1 relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client par nom ou téléphone..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={toggleAll}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {selected.size === filtered.length && filtered.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>

      {/* Liste clients */}
      <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wider border-b ${dark ? "text-gray-500 border-slate-800" : "text-gray-400 border-gray-100"}`}>
                <th className="px-5 py-3 font-medium w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-emerald-600" />
                </th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Téléphone</th>
                <th className="px-3 py-3 font-medium">Adresse</th>
                <th className="px-3 py-3 font-medium">Commandes</th>
                <th className="px-5 py-3 font-medium text-right">Total dépensé</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className={`px-5 py-10 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    <Loader2 size={20} className="animate-spin inline-block mr-2" />
                    Chargement des clients...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-5 py-10 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    Aucun client trouvé. Les clients qui commandent chez vous apparaîtront ici.
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.user_id} className={`border-b last:border-0 transition-colors ${dark ? "border-slate-800/50 hover:bg-slate-800/30" : "border-gray-50 hover:bg-gray-50/50"}`}>
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(c.user_id)}
                      onChange={() => toggleSelect(c.user_id)}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dark ? "bg-slate-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                        {init(c.name)}
                      </div>
                      <span className={`font-medium ${dark ? "text-white" : "text-gray-800"}`}>{c.name}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <span className="inline-flex items-center gap-1"><Phone size={12} />{c.phone || "—"}</span>
                  </td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} />{c.address || "—"}</span>
                  </td>
                  <td className={`px-3 py-3.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <span className="inline-flex items-center gap-1"><ShoppingCart size={12} />{c.order_count || 0}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-bold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(c.total_spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal notification */}
      {notifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setNotifModal(false)}>
          <div className={`rounded-2xl w-full max-w-md shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <div>
                <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Envoyer une notification</h3>
                <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>À {selected.size} client(s) sélectionné(s)</p>
              </div>
              <button onClick={() => setNotifModal(false)} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Type de notification</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "promo", label: "Promo", icon: Tag },
                    { value: "new_arrival", label: "Nouveauté", icon: Sparkles },
                    { value: "info", label: "Info", icon: Bell },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setNotifForm({ ...notifForm, type: t.value })}
                        className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                          notifForm.type === t.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : dark ? "border-slate-700 text-gray-400 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={16} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Titre *</label>
                <input
                  value={notifForm.title}
                  onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                  placeholder="Ex: -20% sur tous les produits !"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Message *</label>
                <textarea
                  value={notifForm.message}
                  onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                  rows={3}
                  placeholder="Décrivez votre offre ou nouveauté..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={sendNotification}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {sending && <Loader2 size={16} className="animate-spin" />}
                  {sending ? "Envoi..." : "Envoyer la notification"}
                </button>
                <button
                  onClick={() => setNotifModal(false)}
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

/* ═══════════════════════════════════════════════════════════
   MODULE E : PERSONNALISATION BOUTIQUE
   ═══════════════════════════════════════════════════════════ */
function CustomizerModule({ products, dark, showToast }) {
  const { profile } = useAuth();
  const shopName = profile?.shopName || profile?.name || "Ma Boutique";

  const [config, setConfig] = useState({
    primaryColor: "#1D9E75",
    secondaryColor: "#0F6E56",
    font: "sans",
    logo: null,
    banner: null,
  });

  const fontCss = FONT_OPTIONS.find(f => f.value === config.font)?.css || FONT_OPTIONS[0].css;

  const handleFile = (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConfig(prev => ({ ...prev, [type]: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const previewProducts = products.slice(0, 4);

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Personnalisation Boutique</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Personnalisez l'apparence de votre boutique en temps réel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 space-y-6 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <div>
            <h2 className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>Identité visuelle</h2>

            <div className="mb-4">
              <label className={labelCls}>Logo de la boutique</label>
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dark ? "border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/5" : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30"}`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFile("logo", e)} />
                {config.logo ? (
                  <img src={config.logo} alt="Logo" className="h-20 w-20 object-contain" />
                ) : (
                  <>
                    <Image size={24} className={`mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`} />
                    <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Glissez votre logo ici ou cliquez</span>
                    <span className={`text-[10px] mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>PNG, JPG — max 2 Mo</span>
                  </>
                )}
              </label>
            </div>

            <div>
              <label className={labelCls}>Bannière de la boutique</label>
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dark ? "border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/5" : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30"}`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFile("banner", e)} />
                {config.banner ? (
                  <img src={config.banner} alt="Bannière" className="h-16 w-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Upload size={20} className={`mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`} />
                    <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Téléchargez votre bannière</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <h2 className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>Couleurs</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Couleur primaire</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={e => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className={`text-xs font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>{config.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Couleur secondaire</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={e => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className={`text-xs font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>{config.secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>Typographie</h2>
            <div>
              <label className={labelCls}>Police de caractères</label>
              <select
                value={config.font}
                onChange={e => setConfig(prev => ({ ...prev, font: e.target.value }))}
                className={inputCls}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`pt-4 border-t ${dark ? "border-slate-800" : "border-gray-100"}`}>
            <button
              onClick={() => showToast("Modifications enregistrées ✅")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className={`px-5 py-3 border-b flex items-center justify-between ${dark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
            <div className="flex items-center gap-2">
              <Eye size={14} className={dark ? "text-gray-500" : "text-gray-400"} />
              <span className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>Aperçu en direct</span>
            </div>
            <span className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Ce que voient vos clients</span>
          </div>

          <div className="p-4" style={{ fontFamily: fontCss }}>
            <div className="rounded-t-xl overflow-hidden border border-gray-200">
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: config.primaryColor }}>
                <div className="flex items-center gap-2">
                  {config.logo ? (
                    <img src={config.logo} alt="Logo" className="w-7 h-7 object-contain rounded" />
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs">🏪</span>
                  )}
                  <span className="text-white font-bold text-sm">{shopName}</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <Home size={16} />
                  <Search size={16} />
                  <ShoppingCart size={16} />
                </div>
              </div>

              <div className="h-24 relative" style={{ backgroundColor: config.secondaryColor }}>
                {config.banner ? (
                  <img src={config.banner} alt="Bannière" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/80 text-sm font-medium">Bienvenue chez {shopName}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  {previewProducts.length === 0 ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-lg border border-gray-100 p-2">
                        <div className="h-12 bg-gray-100 rounded-md mb-2 flex items-center justify-center text-xl">📦</div>
                        <div className="h-2.5 bg-gray-100 rounded mb-1.5" />
                        <div className="h-2 bg-gray-50 rounded w-2/3" />
                      </div>
                    ))
                  ) : previewProducts.map(p => (
                    <div key={p.id} className="bg-white rounded-lg border border-gray-100 p-2 hover:shadow-sm transition-shadow">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-12 w-full object-cover rounded-md mb-2" />
                      ) : (
                        <div className="h-12 bg-gray-50 rounded-md mb-2 flex items-center justify-center text-2xl">{p.emoji || "📦"}</div>
                      )}
                      <p className="text-[11px] font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: config.primaryColor }}>{fmtFCFA(p.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL : SELLER SPACE
   ═══════════════════════════════════════════════════════════ */
export default function SellerSpace() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("soubremarket_vendor_theme") === "dark");
  const [toast, setToast] = useState(null);

  const { orders, loading: ordersLoading } = useOrders({ limit: 50 });
  const { products: apiProducts, loading: productsLoading } = useProducts({ limit: 100 });
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setProducts(apiProducts);
  }, [apiProducts]);

  useEffect(() => {
    localStorage.setItem("soubremarket_vendor_theme", dark ? "dark" : "light");
  }, [dark]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const NAV_ITEMS = [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, desc: "Vue d'ensemble" },
    { key: "products", label: "Mes articles", icon: Package, desc: "Gestion des produits" },
    { key: "clients", label: "Mes clients", icon: Users, desc: "Notifications & suivi" },
    { key: "support", label: "Messagerie Support", icon: MessageSquare, desc: "Aide & assistance" },
    { key: "customizer", label: "Personnalisation", icon: Palette, desc: "Apparence boutique" },
  ];

  const shopName = profile?.shopName || profile?.name || "Ma Boutique";
  const initials = init(profile?.name);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <div className={`min-h-screen flex transition-colors duration-300 ${dark ? "bg-slate-950" : "bg-gray-50"}`}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ─── Sidebar ─── */}
        <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-gray-900 text-white flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Store size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">SoubreMarket</p>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Espace Vendeur</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Gestion</p>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "border-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate">{item.label}</span>
                    <span className="block text-[10px] text-gray-500 truncate">{item.desc}</span>
                  </span>
                  {isActive && <ChevronRight size={14} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}

            <p className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Boutique</p>
            <button
              onClick={() => { setActiveTab("products"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                activeTab === "products"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "border-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Plus size={18} className="shrink-0" />
              <span>Publier un article</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all border border-transparent"
            >
              <Home size={18} className="shrink-0" />
              <span>Voir la boutique</span>
            </button>
          </nav>

          <div className="p-3 border-t border-gray-800 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800 transition-all">
              <div className="w-9 h-9 rounded-full bg-emerald-500/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{profile?.name || "Vendeur"}</p>
                <p className="text-[10px] text-gray-500 truncate">{shopName}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Déconnexion">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Zone principale ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className={`lg:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30 transition-colors ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
            <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg hover:bg-gray-100 ${dark ? "text-white hover:bg-slate-800" : "text-gray-700"}`}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Store size={18} className="text-emerald-600" />
              <span className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>{shopName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDark(d => !d)}
                className={`p-2 rounded-lg transition-colors ${dark ? "text-amber-400 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"}`}
                title={dark ? "Mode clair" : "Mode sombre"}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {initials}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {activeTab === "dashboard" && (
              <DashboardModule orders={orders} products={products} loading={ordersLoading || productsLoading} dark={dark} />
            )}
            {activeTab === "products" && (
              <ProductsModule products={products} setProducts={setProducts} dark={dark} showToast={showToast} />
            )}
            {activeTab === "clients" && (
              <ClientsModule dark={dark} showToast={showToast} />
            )}
            {activeTab === "support" && <VendorMessaging dark={dark} />}
            {activeTab === "customizer" && <CustomizerModule products={products} dark={dark} showToast={showToast} />}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}