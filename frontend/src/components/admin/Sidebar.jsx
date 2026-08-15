/**
 * Sidebar — Navigation latérale du dashboard superadmin.
 * Design : fond bleu foncé, icônes épurées, photo de profil en haut.
 */
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Liens pour le superadmin (gestion complète de la plateforme)
const SUPERADMIN_ITEMS = [
  { to: "/superadmin", label: "Vue d'ensemble", icon: "📊", end: true },
  { to: "/superadmin/vendeurs", label: "Gestion des Vendeurs", icon: "🏪", sub: "Validation KYC, statuts" },
  { to: "/superadmin/clients", label: "Gestion des Clients", icon: "👥", sub: "Comptes clients" },
  { to: "/superadmin/livreurs", label: "Gestion des Livreurs", icon: "🛵", sub: "Validation, statuts" },
  { to: "/superadmin/admins", label: "Gestion des Admins", icon: "👨‍💼", sub: "Créer, modifier, supprimer" },
  { to: "/superadmin/produits", label: "Modération Catalogue", icon: "📦", sub: "Produits, signalements" },
  { to: "/superadmin/commandes", label: "Commandes & Transactions", icon: "🧾", sub: "Suivi multi-vendeurs" },
  { to: "/superadmin/finances", label: "Finances & Payouts", icon: "💰", sub: "Commissions, Stripe Connect" },
  { to: "/superadmin/moderation", label: "Modération", icon: "🛡️", sub: "Commentaires, litiges" },
  { to: "/superadmin/messages", label: "Messagerie", icon: "💬", sub: "Conversations avec vendeurs" },
  { to: "/superadmin/settings", label: "Configuration Globale", icon: "⚙️", sub: "Zones, catégories, thèmes, frais" },
];

// Liens pour l'admin classique (pas de gestion des admins — réservé au superadmin)
const ADMIN_ITEMS = [
  { to: "/admin", label: "Vue d'ensemble", icon: "📊", end: true },
  { to: "/admin/vendeurs", label: "Gestion des Vendeurs", icon: "🏪", sub: "Validation KYC, statuts" },
  { to: "/admin/clients", label: "Gestion des Clients", icon: "👥", sub: "Comptes clients" },
  { to: "/admin/livreurs", label: "Gestion des Livreurs", icon: "🛵", sub: "Validation, statuts" },
  { to: "/admin/produits", label: "Gestion des Produits", icon: "📦", sub: "Catalogue, stock" },
  { to: "/admin/litiges", label: "Gestion des Litiges", icon: "⚖️", sub: "Remboursements, conflits" },
  { to: "/admin/messages", label: "Messagerie", icon: "💬", sub: "Conversations avec vendeurs" },
  { to: "/admin/settings", label: "Configuration", icon: "⚙️", sub: "Paramètres système" },
];

const SECONDARY_ITEMS = [
  { to: "/", label: "Retour à la boutique", icon: "🏠" },
];

// Couleurs de sidebar disponibles
const SIDEBAR_COLORS = [
  { key: "blue", label: "Bleu", bg: "#0B1B3F", border: "border-blue-900/50" },
  { key: "dark", label: "Sombre", bg: "#0f172a", border: "border-slate-800" },
  { key: "emerald", label: "Émeraude", bg: "#064e3b", border: "border-emerald-900/50" },
  { key: "purple", label: "Violet", bg: "#2e1065", border: "border-purple-900/50" },
  { key: "red", label: "Rouge", bg: "#450a0a", border: "border-red-900/50" },
];

export default function Sidebar({ open, onClose }) {
  const { profile } = useAuth();
  const name = profile?.name || "Super Admin";
  const email = profile?.email || "admin@soubremarket.com";
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const isSuperAdmin = profile?.type === "superadmin";
  const NAV_ITEMS = isSuperAdmin ? SUPERADMIN_ITEMS : ADMIN_ITEMS;
  const roleLabel = isSuperAdmin ? "Superadmin" : "Admin";

  // Couleur du sidebar depuis localStorage
  const [sidebarColor, setSidebarColor] = useState(() => localStorage.getItem("soubremarket_sidebar_color") || "blue");
  const currentColor = SIDEBAR_COLORS.find(c => c.key === sidebarColor) || SIDEBAR_COLORS[0];

  useEffect(() => {
    const handler = () => {
      const c = localStorage.getItem("soubremarket_sidebar_color") || "blue";
      setSidebarColor(c);
    };
    window.addEventListener("sidebar:change", handler);
    return () => window.removeEventListener("sidebar:change", handler);
  }, []);

  const changeColor = (key) => {
    localStorage.setItem("soubremarket_sidebar_color", key);
    setSidebarColor(key);
    window.dispatchEvent(new Event("sidebar:change"));
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
      isActive
        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
        : "border-transparent text-slate-300 hover:bg-blue-500/10 hover:text-white"
    }`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 w-64 flex flex-col z-50 transition-all duration-200 lg:translate-x-0 lg:static lg:z-auto ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ backgroundColor: currentColor.bg, borderRight: `1px solid ${currentColor.bg}` }}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-blue-900/50 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-lg">
            🛍️
          </div>
          <div>
            <p className="font-bold text-white leading-tight">SoubreMarket</p>
            <p className="text-[10px] uppercase tracking-widest text-blue-300 font-semibold">{roleLabel}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-blue-300/60 font-semibold">Pilotage</p>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={linkClass}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.sub && <span className="block text-[10px] text-blue-300/50 truncate">{item.sub}</span>}
              </span>
            </NavLink>
          ))}

          <p className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-blue-300/60 font-semibold">Autres</p>
          {SECONDARY_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} onClick={onClose} className={linkClass}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sélecteur de couleur sidebar */}
        <div className="px-4 py-3 border-t border-blue-900/50 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-blue-300/60 font-semibold mb-2">Couleur sidebar</p>
          <div className="flex gap-2">
            {SIDEBAR_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => changeColor(c.key)}
                title={c.label}
                className={`w-7 h-7 rounded-full transition-all ${sidebarColor === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>
        </div>

        {/* Profil admin */}
        <div className="p-3 border-t border-blue-900/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-blue-500/10 transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-blue-500/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-[10px] text-blue-300/60 truncate">{email}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Connecté" />
          </div>
        </div>
      </aside>
    </>
  );
}