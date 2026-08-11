import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User, Package, Heart, MapPin, Store, ChevronRight, Menu,
  LogOut, Home, Trash2, Plus, Pencil, Download, Truck, CheckCircle2,
  XCircle, Clock, ShoppingCart, AlertTriangle, Sparkles, Search, ArrowRight,
  Check, Shield, Sun, Moon, Palette, Smartphone, Zap, Droplets, Wifi,
  Minus, Tag, Lock, Wallet, Save, RefreshCw, Store as StoreIcon, Bell
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useProducts } from "../../hooks/useProducts";
import { useCart } from "../../hooks/useCart";
import { Zones } from "../../api/client";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const init = (name) => name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";

// Message de bienvenue selon l'heure : 00h-12h = Bonjour, 12h-23h59 = Bonsoir
const getGreeting = () => {
  const h = new Date().getHours();
  return h >= 0 && h < 12 ? "Bonjour" : "Bonsoir";
};
const getGreetingEmoji = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "☀️" : "🌙";
};

const ORDER_STEPS = [
  { key: "pending",    label: "Validée",         icon: CheckCircle2 },
  { key: "assigned",   label: "En préparation",  icon: Clock },
  { key: "picked",     label: "Expédiée",        icon: Truck },
  { key: "delivering", label: "En livraison",    icon: Truck },
  { key: "delivered",  label: "Livrée",          icon: CheckCircle2 },
];
const STEP_KEYS = ORDER_STEPS.map(s => s.key);

const ORDER_STATUS = {
  pending:    { label: "En cours",       cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  assigned:   { label: "En préparation", cls: "bg-sky-50 text-sky-700 border-sky-200", icon: Clock },
  picked:     { label: "Expédiée",       cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck },
  delivering: { label: "En livraison",   cls: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Truck },
  delivered:  { label: "Livrée",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled:  { label: "Annulée",        cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

const MOBILE_MONEY_OPTIONS = [
  { key: "wave",         label: "Wave",          icon: Zap,      color: "#00A5F0" },
  { key: "orange_money", label: "Orange Money",  icon: Smartphone, color: "#FF7900" },
  { key: "moov_money",   label: "Moov Money",    icon: Droplets, color: "#0072CE" },
  { key: "mtn_money",    label: "MTN Money",     icon: Wifi,     color: "#FFCC00" },
];

const SIDEBAR_COLORS = [
  { key: "emerald", label: "Émeraude", bg: "#0F6E56", accent: "#34d399" },
  { key: "blue",    label: "Bleu",     bg: "#1e3a5f", accent: "#60a5fa" },
  { key: "purple",  label: "Violet",   bg: "#5b21b6", accent: "#a78bfa" },
  { key: "slate",   label: "Gris",     bg: "#334155", accent: "#94a3b8" },
  { key: "dark",    label: "Noir",     bg: "#18181b", accent: "#71717a" },
];

const FALLBACK_ZONES = [
  { id: 1, name: "Centre-ville", maxKm: 2,  price: 500 },
  { id: 2, name: "Quartier Nord", maxKm: 5, price: 1000 },
  { id: 3, name: "Quartier Sud",  maxKm: 10, price: 1500 },
  { id: 4, name: "Périphérie",    maxKm: 20, price: 2500 },
];

/* ═══════════════════════════════════════════════════════════
   MODULE : MON PANIER MULTI-VENDEURS
   ═══════════════════════════════════════════════════════════ */
function CartModule({ dark, showToast }) {
  const { items, add, remove, total, count, clear } = useCart();
  const [zones, setZones] = useState(FALLBACK_ZONES);
  const [zone, setZone] = useState(FALLBACK_ZONES[0]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [savedForLater, setSavedForLater] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("soubremarket_saved_later") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    Zones.list()
      .then(data => {
        const apiZones = data.zones || [];
        if (apiZones.length > 0) { setZones(apiZones); setZone(apiZones[0]); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem("soubremarket_saved_later", JSON.stringify(savedForLater));
  }, [savedForLater]);

  const cartItems = Object.values(items);

  // Grouper par vendeur
  const groupedByVendor = useMemo(() => {
    const groups = {};
    cartItems.forEach(({ product, qty }) => {
      const vendorName = product.vendors?.shop_name || product.shop_name || "Vendeur";
      if (!groups[vendorName]) groups[vendorName] = [];
      groups[vendorName].push({ product, qty });
    });
    return groups;
  }, [cartItems]);

  const subtotal = useMemo(() => cartItems.reduce((s, { product, qty }) => s + product.price * qty, 0), [cartItems]);
  const deliveryFee = zone?.price || 0;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const totalTTC = subtotal + deliveryFee - discount;

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === "SOUBRE10" || code === "PROMO10") {
      setPromoApplied(true);
      setPromoDiscount(Math.round(subtotal * 0.1));
      showToast("Code promo appliqué : -10% ✅");
    } else {
      setPromoApplied(false);
      setPromoDiscount(0);
      showToast("Code promo invalide", "error");
    }
  };

  const saveForLater = (product) => {
    remove(product.id);
    setSavedForLater(prev => [...prev, product]);
    showToast(`${product.name} sauvegardé pour plus tard 💾`);
  };

  const moveToCart = (product) => {
    add(product);
    setSavedForLater(prev => prev.filter(p => p.id !== product.id));
    showToast(`${product.name} remis dans le panier ✅`);
  };

  const removeSaved = (productId) => {
    setSavedForLater(prev => prev.filter(p => p.id !== productId));
    showToast("Produit retiré de la liste");
  };

  const handleCheckout = () => {
    showToast("Redirection vers le paiement sécurisé...");
    // Dans une vraie implémentation, on redirigerait vers /panier
    setTimeout(() => {
      window.location.href = "/panier";
    }, 1000);
  };

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;

  if (count === 0 && savedForLater.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Mon Panier</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Votre panier multi-vendeurs</p>
        </div>
        <div className={`text-center py-20 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
          <div className="text-6xl mb-4">🛒</div>
          <h3 className={`text-base font-semibold mb-1 ${dark ? "text-white" : "text-gray-800"}`}>Votre panier est vide</h3>
          <p className="text-sm mb-6">Découvrez des produits de nos vendeurs partenaires.</p>
          <button
            onClick={() => window.location.href = "/catalogue"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Search size={16} />
            Explorer le catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Mon Panier</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {count} article(s) · {Object.keys(groupedByVendor).length} vendeur(s)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Colonne gauche : produits groupés par vendeur ─── */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(groupedByVendor).map(([vendorName, vendorItems]) => {
            const vendorSubtotal = vendorItems.reduce((s, { product, qty }) => s + product.price * qty, 0);
            return (
              <div key={vendorName} className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                {/* En-tête vendeur */}
                <div className={`px-5 py-3 border-b flex items-center gap-2 ${dark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
                  <StoreIcon size={16} className="text-emerald-600" />
                  <p className={`text-xs font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    Vendu et expédié par : <span className="text-emerald-600">{vendorName}</span>
                  </p>
                  <span className={`ml-auto text-xs font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    Sous-total : {fmtFCFA(vendorSubtotal)}
                  </span>
                </div>

                {/* Produits du vendeur */}
                <div className="divide-y divide-gray-50">
                  {vendorItems.map(({ product, qty }) => (
                    <div key={product.id} className="px-5 py-4 flex items-center gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{product.emoji || "📦"}</span>
                        )}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-900"}`}>{product.name}</p>
                        <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                          Prix unitaire : <span className="font-semibold">{fmtFCFA(product.price)}</span>
                        </p>
                        <p className={`text-[10px] mt-0.5 inline-flex items-center gap-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                          <Truck size={10} /> Livraison estimée : 2-3 jours
                        </p>
                      </div>

                      {/* Contrôles */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantité */}
                        <div className={`flex items-center rounded-xl border ${dark ? "border-slate-700" : "border-gray-200"}`}>
                          <button
                            onClick={() => remove(product.id)}
                            className={`w-8 h-8 flex items-center justify-center transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-slate-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className={`w-8 text-center text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{qty}</span>
                          <button
                            onClick={() => add(product)}
                            className={`w-8 h-8 flex items-center justify-center transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-slate-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Prix total ligne */}
                        <span className={`text-sm font-bold w-24 text-right ${dark ? "text-white" : "text-gray-900"}`}>
                          {fmtFCFA(product.price * qty)}
                        </span>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => saveForLater(product)}
                            className={`text-[10px] inline-flex items-center gap-1 transition-colors ${dark ? "text-gray-500 hover:text-emerald-400" : "text-gray-400 hover:text-emerald-600"}`}
                          >
                            <Save size={10} />
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => { remove(product.id); showToast(`${product.name} supprimé du panier`); }}
                            className={`text-[10px] inline-flex items-center gap-1 transition-colors ${dark ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}
                          >
                            <Trash2 size={10} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Sauvegardés pour plus tard */}
          {savedForLater.length > 0 && (
            <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
              <div className={`px-5 py-3 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
                <p className={`text-xs font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  💾 Sauvegardés pour plus tard ({savedForLater.length})
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {savedForLater.map(product => (
                  <div key={product.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{product.emoji || "📦"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-900"}`}>{product.name}</p>
                      <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{fmtFCFA(product.price)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => moveToCart(product)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${dark ? "border-slate-700 text-emerald-400 hover:bg-emerald-500/10" : "border-gray-200 text-emerald-600 hover:bg-emerald-50"}`}
                      >
                        Remettre au panier
                      </button>
                      <button
                        onClick={() => removeSaved(product.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${dark ? "border-slate-700 text-red-400 hover:bg-red-500/10" : "border-gray-200 text-red-600 hover:bg-red-50"}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Colonne droite : résumé sticky ─── */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className={`rounded-2xl border p-5 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
            <h2 className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>Résumé de la commande</h2>

            {/* Sous-total */}
            <div className="flex justify-between py-2 text-sm">
              <span className={dark ? "text-gray-400" : "text-gray-500"}>Sous-total articles</span>
              <span className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(subtotal)}</span>
            </div>

            {/* Livraison */}
            <div className="flex justify-between py-2 text-sm">
              <span className={dark ? "text-gray-400" : "text-gray-500"}>Frais de livraison</span>
              <span className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(deliveryFee)}</span>
            </div>

            {/* Zone de livraison */}
            <div className="py-2">
              <label className={`block text-xs mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Zone de livraison</label>
              <select
                value={zone?.id}
                onChange={e => setZone(zones.find(z => z.id === Number(e.target.value)) || zones[0])}
                className={inputCls}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} — {fmtFCFA(z.price)}</option>
                ))}
              </select>
            </div>

            {/* Code promo */}
            <div className="py-2">
              <label className={`block text-xs mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Code promo</label>
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="SOUBRE10"
                  className={inputCls}
                />
                <button
                  onClick={applyPromo}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                    promoApplied
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {promoApplied ? <><Check size={12} className="inline" /> Appliqué</> : "Appliquer"}
                </button>
              </div>
              {promoApplied && (
                <p className={`text-[10px] mt-1 text-emerald-600`}>-10% appliqué ({fmtFCFA(promoDiscount)})</p>
              )}
            </div>

            {/* Remise */}
            {promoApplied && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-emerald-600">Remise promo</span>
                <span className="font-semibold text-emerald-600">-{fmtFCFA(promoDiscount)}</span>
              </div>
            )}

            {/* Total */}
            <div className={`flex justify-between py-3 mt-2 border-t text-base font-bold ${dark ? "border-slate-800 text-white" : "border-gray-100 text-gray-900"}`}>
              <span>Total TTC</span>
              <span className="text-emerald-600">{fmtFCFA(totalTTC)}</span>
            </div>

            {/* Bouton paiement */}
            <button
              onClick={handleCheckout}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Procéder au paiement
            </button>
            <p className={`text-[10px] text-center mt-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              🔒 Paiement sécurisé · Wave, Orange Money, Moov, MTN
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE : MON PROFIL
   ═══════════════════════════════════════════════════════════ */
function ProfileModule({ dark }) {
  const { profile, user } = useAuth();
  const [form, setForm] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: profile?.name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    });
  }, [profile]);

  const email = user?.email || "";

  const handleSave = () => {
    localStorage.setItem("soubremarket_client_profile", JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  const greeting = getGreeting();
  const greetingEmoji = getGreetingEmoji();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{greetingEmoji} {greeting}, {profile?.name?.split(" ")[0] || "cher client"} !</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Gérez vos informations personnelles</p>
      </div>

      <div className={`rounded-2xl border p-6 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
            {init(profile?.name)}
          </div>
          <div>
            <p className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{profile?.name || "—"}</p>
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{email}</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full mt-1 text-[10px] font-medium border ${dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Compte actif
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nom complet</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 07 00 00 00 00" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Adresse</label>
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Quartier, ville, repères..." className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saved ? <><Check size={16} /> Enregistré !</> : "Enregistrer les modifications"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
              <CheckCircle2 size={16} /> Profil mis à jour
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE : NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
function NotificationsModule({ dark }) {
  const { orders } = useOrders({ limit: 50 });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const deliveredOrders = orders.filter(o => o.status === "delivered");
    const notifs = deliveredOrders.map(order => ({
      id: order.id,
      type: "delivered",
      title: "Colis livré !",
      message: `Votre commande ${order.orderNumber || order.id.slice(0, 8)} a été livrée avec succès.`,
      date: order.updatedAt || order.createdAt,
      orderId: order.id,
    }));
    setNotifications(notifs);
  }, [orders]);

  const unreadCount = notifications.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Notifications</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {unreadCount > 0 ? `${unreadCount} notification(s)` : "Aucune notification"}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-sm">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div key={notif.id} className={`rounded-2xl border p-4 flex items-start gap-4 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{notif.title}</p>
                <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{notif.message}</p>
                <p className={`text-[10px] mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  {notif.date ? new Date(notif.date).toLocaleString("fr-FR") : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE : MES COMMANDES
   ═══════════════════════════════════════════════════════════ */
function OrdersModule({ dark }) {
  const { orders, loading } = useOrders({ limit: 50 });
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") return orders.filter(o => !["delivered", "cancelled"].includes(o.status));
    if (filter === "returned") return orders.filter(o => o.status === "cancelled");
    return orders;
  }, [orders, filter]);

  const getStepIndex = (status) => {
    const idx = STEP_KEYS.indexOf(status);
    return idx === -1 ? (status === "cancelled" ? -1 : 0) : idx;
  };

  const filterTabs = [
    { key: "all", label: `Toutes (${orders.length})` },
    { key: "active", label: `En cours (${orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length})` },
    { key: "returned", label: `Retournées (${orders.filter(o => o.status === "cancelled").length})` },
  ];

  const getPayMethodLabel = (method) => {
    if (method === "cash") return "💵 Cash";
    return MOBILE_MONEY_OPTIONS.find(m => m.key === method)?.label || method || "—";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Mes Commandes</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Suivez vos commandes et téléchargez vos factures</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filter === tab.key
                ? dark ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                : dark ? "bg-slate-900 border-slate-800 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`text-center py-16 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm">Chargement de vos commandes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
          <div className="text-5xl mb-3">🛍️</div>
          <p className="text-sm">Aucune commande pour le moment.</p>
        </div>
      ) : filtered.map(order => {
        const stepIdx = getStepIndex(order.status);
        const isCancelled = order.status === "cancelled";
        const statusInfo = ORDER_STATUS[order.status] || { label: order.status, cls: "bg-gray-50 text-gray-600 border-gray-200", icon: Package };
        const StatusIcon = statusInfo.icon;

        return (
          <div key={order.id} className={`rounded-2xl border overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2 ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <div>
                <p className={`font-mono text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{order.orderNumber || order.order_number || order.id.slice(0, 8)}</p>
                <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {fmtDate(order.createdAt || order.created_at)} à {fmtTime(order.createdAt || order.created_at)}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusInfo.cls}`}>
                <StatusIcon size={12} />
                {statusInfo.label}
              </span>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-2 mb-4">
                {(order.orderItems || []).map(item => (
                  <div key={item.id || item.productId} className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl">{item.emoji || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-800"}`}>{item.name}</p>
                      <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>× {item.qty} · {fmtFCFA(item.price)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(item.subtotal || item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {!isCancelled ? (
                <div className="mb-4">
                  <div className="flex items-center">
                    {ORDER_STEPS.map((step, i) => {
                      const Icon = step.icon;
                      const isDone = i <= stepIdx;
                      const isCurrent = i === stepIdx;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isDone
                                ? "bg-emerald-500 text-white shadow-md"
                                : dark ? "bg-slate-800 text-gray-500" : "bg-gray-100 text-gray-400"
                            } ${isCurrent ? "ring-2 ring-emerald-300 scale-110" : ""}`}>
                              <Icon size={14} />
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isDone ? "text-emerald-600 font-medium" : dark ? "text-gray-600" : "text-gray-400"}`}>
                              {step.label}
                            </span>
                          </div>
                          {i < ORDER_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-1 mb-5 rounded ${i < stepIdx ? "bg-emerald-500" : dark ? "bg-slate-800" : "bg-gray-200"}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`px-4 py-3 rounded-xl text-sm mb-4 ${dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
                  Cette commande a été annulée.
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Total payé</p>
                  <p className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(order.total)}</p>
                  <p className={`text-[10px] mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                    Paiement : {getPayMethodLabel(order.payMethod)}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    <Truck size={14} />
                    Suivre le colis
                  </button>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    onClick={() => {
                      const content = [
                        "=== FACTURE SOUbREMARKET ===",
                        `Commande: ${order.orderNumber || order.id}`,
                        `Date: ${fmtDate(order.createdAt || order.created_at)}`,
                        "",
                        ...(order.orderItems || []).map(i => `${i.name} x${i.qty} — ${fmtFCFA(i.subtotal || i.price * i.qty)}`),
                        "",
                        `Sous-total: ${fmtFCFA(order.subtotal)}`,
                        `Livraison: ${fmtFCFA(order.deliveryFee || 0)}`,
                        `Total: ${fmtFCFA(order.total)}`,
                      ].join("\n");
                      const blob = new Blob([content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `facture-${order.orderNumber || order.id}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={14} />
                    Télécharger la facture
                  </button>
                  {!isCancelled && order.status !== "delivered" && (
                    <button
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-200 hover:bg-amber-500/20 transition-colors"
                      onClick={() => {
                        if (confirm("Voulez-vous demander un retour pour cette commande ?")) {
                          alert("Votre demande de retour a été soumise. Notre équipe vous contactera.");
                        }
                      }}
                    >
                      <ArrowRight size={14} />
                      Demander un retour
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedOrder(null)}>
          <div className={`rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <div>
                <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Suivi du colis</h3>
                <p className={`text-xs mt-0.5 font-mono ${dark ? "text-gray-500" : "text-gray-400"}`}>{selectedOrder.orderNumber || selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`rounded-xl p-4 border ${dark ? "border-slate-800 bg-slate-950/50" : "border-gray-100 bg-gray-50"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Truck size={22} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                      {selectedOrder.status === "delivered" ? "Livraison effectuée" : "Commande en cours de traitement"}
                    </p>
                    <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      Livreur : {selectedOrder.livreur?.name || "En attente d'assignation"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Adresse de livraison", selectedOrder.deliveryAddr || "—"],
                  ["Zone", selectedOrder.zone?.name || "—"],
                  ["Paiement", getPayMethodLabel(selectedOrder.payMethod)],
                  ["Statut paiement", selectedOrder.payStatus === "paid" ? "✅ Payé" : "⏳ En attente"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className={dark ? "text-gray-500" : "text-gray-400"}>{label}</span>
                    <span className={`font-medium text-right max-w-60 ${dark ? "text-gray-200" : "text-gray-700"}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-700 text-gray-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  Fermer
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
   MODULE : MA LISTE D'ENVIES (WISHLIST)
   ═══════════════════════════════════════════════════════════ */
function WishlistModule({ dark, showToast }) {
  const { products } = useProducts({ limit: 100 });
  const { add } = useCart();
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("soubremarket_wishlist") || "[]");
      setWishlist(saved);
    } catch {
      setWishlist([]);
    }
  }, []);

  const handleRemove = (productId) => {
    const next = wishlist.filter(p => p.id !== productId);
    setWishlist(next);
    localStorage.setItem("soubremarket_wishlist", JSON.stringify(next));
    showToast("Produit retiré de la wishlist");
  };

  const handleAddToCart = (product) => {
    add(product);
    showToast(`${product.name} ajouté au panier ✅`);
  };

  const suggestions = products.filter(p => !wishlist.some(w => w.id === p.id)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Ma Liste d'envies</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {wishlist.length > 0 ? `${wishlist.length} produit(s) sauvegardé(s)` : "Aucun produit dans votre wishlist"}
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
          <div className="text-6xl mb-4">💝</div>
          <h3 className={`text-base font-semibold mb-1 ${dark ? "text-white" : "text-gray-800"}`}>Votre wishlist est vide</h3>
          <p className="text-sm mb-6">Découvrez des produits recommandés pour vous ci-dessous.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wishlist.map(product => (
            <WishlistCard
              key={product.id}
              product={product}
              dark={dark}
              onRemove={() => handleRemove(product.id)}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h2 className={`text-sm font-semibold mb-3 ${dark ? "text-white" : "text-gray-800"}`}>✨ Suggestions pour vous</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suggestions.map(product => (
              <div key={product.id} className={`rounded-2xl border overflow-hidden transition-all ${dark ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-gray-100 shadow-sm hover:shadow-md"}`}>
                <div className="relative h-28 flex items-center justify-center bg-gray-50">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{product.emoji || "📦"}</span>
                  )}
                  <button
                    onClick={() => {
                      const next = [...wishlist, product];
                      setWishlist(next);
                      localStorage.setItem("soubremarket_wishlist", JSON.stringify(next));
                      showToast(`${product.name} ajouté à la wishlist 💝`);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                    title="Ajouter à la wishlist"
                  >
                    <Heart size={14} />
                  </button>
                </div>
                <div className="p-3.5">
                  <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{product.name}</p>
                  <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>🏪 {product.vendors?.shop_name || "Vendeur"}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(product.price)}</span>
                    <button
                      onClick={() => { add(product); showToast(`${product.name} ajouté au panier ✅`); }}
                      disabled={product.stock <= 0}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      <ShoppingCart size={12} />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE : ADRESSES & PAIEMENT
   ═══════════════════════════════════════════════════════════ */
function AddressesModule({ dark, showToast }) {
  const { profile } = useAuth();

  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("soubremarket_addresses") || "null");
      if (saved) return saved;
    } catch {}
    return profile?.address ? [
      { id: 1, label: "Maison", street: profile.address, city: "Soubré", default: true }
    ] : [];
  });

  const [mobileMoney, setMobileMoney] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("soubremarket_mobilemoney") || "null");
      if (saved) return saved;
    } catch {}
    return [
      { key: "wave", number: "07 07 07 07 07", holder: profile?.name || "CLIENT", default: true },
      { key: "orange_money", number: "05 05 05 05 05", holder: profile?.name || "CLIENT", default: false },
    ];
  });

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ label: "", street: "", city: "Soubré" });
  const [moneyForm, setMoneyForm] = useState({ key: "wave", number: "", holder: "" });

  useEffect(() => {
    localStorage.setItem("soubremarket_addresses", JSON.stringify(addresses));
  }, [addresses]);
  useEffect(() => {
    localStorage.setItem("soubremarket_mobilemoney", JSON.stringify(mobileMoney));
  }, [mobileMoney]);

  const handleAddAddress = () => {
    if (!form.street.trim() || !form.label.trim()) {
      showToast("Libellé et adresse requis", "error");
      return;
    }
    const newAddr = {
      id: Date.now(),
      label: form.label,
      street: form.street,
      city: form.city || "Soubré",
      default: addresses.length === 0,
    };
    setAddresses(prev => [...prev, newAddr]);
    setForm({ label: "", street: "", city: "Soubré" });
    setModal(null);
    showToast("Adresse ajoutée ✅");
  };

  const handleAddMoney = () => {
    if (!moneyForm.number.trim() || !moneyForm.holder.trim()) {
      showToast("Numéro et titulaire requis", "error");
      return;
    }
    const method = MOBILE_MONEY_OPTIONS.find(m => m.key === moneyForm.key);
    const newItem = {
      key: moneyForm.key,
      number: moneyForm.number,
      holder: moneyForm.holder.toUpperCase(),
      default: mobileMoney.length === 0,
    };
    setMobileMoney(prev => [...prev, newItem]);
    setMoneyForm({ key: "wave", number: "", holder: "" });
    setModal(null);
    showToast(`${method?.label || "Compte"} ajouté ✅`);
  };

  const setDefaultAddress = (id) => {
    setAddresses(prev => prev.map(a => ({ ...a, default: a.id === id })));
    showToast("Adresse par défaut définie");
  };

  const setDefaultMoney = (idx) => {
    setMobileMoney(prev => prev.map((m, i) => ({ ...m, default: i === idx })));
    showToast("Méthode de paiement par défaut définie");
  };

  const deleteAddress = (id) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    showToast("Adresse supprimée");
  };

  const deleteMoney = (idx) => {
    setMobileMoney(prev => prev.filter((_, i) => i !== idx));
    showToast("Méthode de paiement supprimée");
  };

  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-slate-800 border-slate-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-900 placeholder-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Adresses & Paiement</h1>
        <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Gérez vos adresses de livraison et moyens de paiement mobile money</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Adresses ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>📍 Adresses de livraison</h2>
            <button
              onClick={() => setModal("address")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {addresses.length === 0 ? (
              <div className={`text-center py-10 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                <MapPin size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune adresse enregistrée</p>
              </div>
            ) : addresses.map(addr => (
              <div key={addr.id} className={`rounded-2xl border p-4 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${addr.default ? "bg-emerald-100 text-emerald-600" : dark ? "bg-slate-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                      <Home size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{addr.label}</p>
                        {addr.default && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            <Check size={10} /> Défaut
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{addr.street}</p>
                      <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>📍 {addr.city}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className={`inline-flex items-center gap-1.5 text-xs cursor-pointer select-none ${addr.default ? (dark ? "text-emerald-400" : "text-emerald-600") : dark ? "text-gray-400" : "text-gray-500"}`}>
                      <input
                        type="checkbox"
                        checked={addr.default}
                        onChange={() => setDefaultAddress(addr.id)}
                        className="w-3.5 h-3.5 rounded accent-emerald-600"
                      />
                      Par défaut
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => showToast(`Modifier l'adresse "${addr.label}"`)}
                        className={`p-1.5 rounded-lg border transition-colors ${dark ? "border-slate-700 text-blue-400 hover:bg-blue-500/10" : "border-gray-200 text-blue-600 hover:bg-blue-50"}`}
                        title="Modifier"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${dark ? "border-slate-700 text-red-400 hover:bg-red-500/10" : "border-gray-200 text-red-600 hover:bg-red-50"}`}
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Mobile Money ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>📱 Mobile Money</h2>
            <button
              onClick={() => setModal("money")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>

          <p className={`text-xs mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Gérez vos comptes Wave, Orange Money, Moov Money et MTN Money
          </p>

          <div className="space-y-3">
            {mobileMoney.length === 0 ? (
              <div className={`text-center py-10 rounded-2xl border ${dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                <Wallet size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun compte mobile money</p>
              </div>
            ) : mobileMoney.map((money, idx) => {
              const method = MOBILE_MONEY_OPTIONS.find(m => m.key === money.key) || MOBILE_MONEY_OPTIONS[0];
              const Icon = method.icon;
              return (
                <div key={idx} className={`rounded-2xl border p-4 ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white`} style={{ backgroundColor: method.color }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{method.label}</p>
                          {money.default && (
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                              <Check size={10} /> Défaut
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 font-mono ${dark ? "text-gray-400" : "text-gray-500"}`}>{money.number}</p>
                        <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Titulaire : {money.holder}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <label className={`inline-flex items-center gap-1.5 text-xs cursor-pointer select-none ${money.default ? (dark ? "text-emerald-400" : "text-emerald-600") : dark ? "text-gray-400" : "text-gray-500"}`}>
                        <input
                          type="checkbox"
                          checked={money.default}
                          onChange={() => setDefaultMoney(idx)}
                          className="w-3.5 h-3.5 rounded accent-emerald-600"
                        />
                        Par défaut
                      </label>
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => deleteMoney(idx)}
                          className={`p-1.5 rounded-lg border transition-colors ${dark ? "border-slate-700 text-red-400 hover:bg-red-500/10" : "border-gray-200 text-red-600 hover:bg-red-50"}`}
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 rounded-xl border p-4 ${dark ? "border-slate-800 bg-slate-900" : "border-gray-100 bg-gray-50"}`}>
            <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Méthodes disponibles sur SoubreMarket</p>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MONEY_OPTIONS.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: m.color }}>
                      <Icon size={12} />
                    </span>
                    <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-600"}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ajouter adresse */}
      {modal === "address" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setModal(null)}>
          <div className={`rounded-2xl w-full max-w-md shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Ajouter une adresse</h3>
              <button onClick={() => setModal(null)} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Libellé *</label>
                <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Maison, Bureau..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Adresse *</label>
                <textarea value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} rows={2} placeholder="Quartier, rue, repères..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Ville</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputCls} />
              </div>
              <button
                onClick={handleAddAddress}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Ajouter l'adresse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter mobile money */}
      {modal === "money" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setModal(null)}>
          <div className={`rounded-2xl w-full max-w-md shadow-2xl ${dark ? "bg-slate-900 border border-slate-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
              <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Ajouter un compte mobile money</h3>
              <button onClick={() => setModal(null)} className={`${dark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Opérateur *</label>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILE_MONEY_OPTIONS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMoneyForm({ ...moneyForm, key: m.key })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                          moneyForm.key === m.key
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : dark ? "border-slate-700 text-gray-400 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={14} style={{ color: moneyForm.key === m.key ? "white" : m.color }} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Numéro *</label>
                <input
                  value={moneyForm.number}
                  onChange={e => setMoneyForm({ ...moneyForm, number: e.target.value })}
                  placeholder="07 07 07 07 07"
                  className={inputCls}
                  inputMode="tel"
                />
              </div>
              <div>
                <label className={labelCls}>Titulaire *</label>
                <input
                  value={moneyForm.holder}
                  onChange={e => setMoneyForm({ ...moneyForm, holder: e.target.value })}
                  placeholder="JEAN DUPONT"
                  className={inputCls}
                />
              </div>
              <button
                onClick={handleAddMoney}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Ajouter le compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL : CUSTOMER SPACE
   ═══════════════════════════════════════════════════════════ */
export default function CustomerSpace() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("soubremarket_client_theme") === "dark");
  const [sidebarColor, setSidebarColor] = useState(() => localStorage.getItem("soubremarket_client_sidebar_color") || "emerald");
  const [toast, setToast] = useState(null);
  const { count: cartCount } = useCart();

  useEffect(() => {
    localStorage.setItem("soubremarket_client_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("soubremarket_client_sidebar_color", sidebarColor);
  }, [sidebarColor]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const NAV_ITEMS = [
    { key: "profile",   label: "Mon Profil",          icon: User,      desc: "Informations personnelles" },
    { key: "orders",    label: "Mes Commandes",       icon: Package,   desc: "Suivi & historiques" },
    { key: "notifications", label: "Notifications",   icon: Bell,      desc: "Centre de notifications" },
    { key: "wishlist",  label: "Ma Liste d'envies",   icon: Heart,     desc: "Produits sauvegardés" },
    { key: "addresses", label: "Adresses & Paiement", icon: MapPin,    desc: "Livraison & mobile money" },
    { key: "cart",      label: "Mon Panier",          icon: ShoppingCart, desc: cartCount > 0 ? `${cartCount} article(s)` : "Voir le panier" },
  ];

  const currentColor = SIDEBAR_COLORS.find(c => c.key === sidebarColor) || SIDEBAR_COLORS[0];
  const shopName = profile?.name || "Client";
  const initials = init(profile?.name);
  const email = user?.email || "";

  const linkBase = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border";

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${dark ? "bg-slate-950" : "bg-gray-50"}`}>
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2 text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 text-white flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ backgroundColor: currentColor.bg }}>
        <div className="h-16 flex items-center gap-3 px-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Store size={18} style={{ color: currentColor.accent }} />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">SoubreMarket</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: currentColor.accent }}>Espace Client</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Mon compte</p>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                className={`${linkBase} ${
                  isActive
                    ? "bg-white/15 text-white border-white/20"
                    : "border-transparent hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} className="shrink-0" style={{ color: isActive ? currentColor.accent : "rgba(255,255,255,0.7)" }} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{item.label}</span>
                  <span className="block text-[10px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{item.desc}</span>
                </span>
                {item.key === "cart" && cartCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {cartCount}
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="shrink-0" style={{ color: currentColor.accent }} />}
              </button>
            );
          })}

          <p className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Boutique</p>
          <button
            onClick={() => navigate("/catalogue")}
            className={`${linkBase} border-transparent hover:bg-white/10 hover:text-white`}
          >
            <Search size={18} className="shrink-0" style={{ color: "rgba(255,255,255,0.7)" }} />
            <span>Explorer le catalogue</span>
          </button>
          <button
            onClick={() => navigate("/")}
            className={`${linkBase} border-transparent hover:bg-white/10 hover:text-white`}
          >
            <Home size={18} className="shrink-0" style={{ color: "rgba(255,255,255,0.7)" }} />
            <span>Accueil</span>
          </button>
        </nav>

        {/* Sélecteur de couleur sidebar */}
        <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Couleur</p>
            <Palette size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
          </div>
          <div className="flex gap-2">
            {SIDEBAR_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => setSidebarColor(c.key)}
                title={c.label}
                className={`w-7 h-7 rounded-full transition-all ${sidebarColor === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>
        </div>

        {/* Profil */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{shopName}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{email || "client@soubremarket.com"}</p>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-red-400 transition-colors" title="Déconnexion">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Zone principale ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`lg:hidden border-b px-4 py-3 sticky top-0 z-30 transition-colors ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg hover:bg-gray-100 ${dark ? "text-white hover:bg-slate-800" : "text-gray-700"}`}>
              <Menu size={20} />
            </button>
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
          </div>
          {/* Message de bienvenue dynamique selon l'heure */}
          <p className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>
            {getGreetingEmoji()} {getGreeting()}, {profile?.name?.split(" ")[0] || "cher client"} !
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === "profile" && <ProfileModule dark={dark} />}
          {activeTab === "orders" && <OrdersModule dark={dark} />}
          {activeTab === "notifications" && <NotificationsModule dark={dark} />}
          {activeTab === "wishlist" && <WishlistModule dark={dark} showToast={showToast} />}
          {activeTab === "addresses" && <AddressesModule dark={dark} showToast={showToast} />}
          {activeTab === "cart" && <CartModule dark={dark} showToast={showToast} />}
        </main>
      </div>
    </div>
  );
}