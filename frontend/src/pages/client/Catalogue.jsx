import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import Toast from "../../components/Toast";
import {
  Search, X, Filter, Heart, ShoppingCart, Star, Home, ChevronRight,
  Grid, List, SortAsc, SortDesc, Tag, Shield, Award, Zap, Smartphone,
  Headphones, Watch, Shirt, Home as HomeIcon, Sparkles, Package,
  CheckCircle2, RefreshCw, User
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MESSAGE DE BIENVENUE
   ═══════════════════════════════════════════════════════════ */
const getGreeting = () => {
  const h = new Date().getHours();
  return h >= 0 && h < 12 ? "Bonjour" : "Bonsoir";
};
const getGreetingEmoji = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "☀️" : "🌙";
};

/* ═══════════════════════════════════════════════════════════
   PRODUITS MOCKÉS (8 produits réalistes)
   ═══════════════════════════════════════════════════════════ */
const MOCK_PRODUCTS = [
  {
    id: 1,
    title: "Écouteurs Bluetooth sans fil",
    price: 24900,
    originalPrice: 32000,
    vendorName: "TechStore",
    rating: 4.7,
    reviewCount: 128,
    condition: "Neuf",
    category: "High-Tech",
    badge: "Top Vendeur",
    emoji: "🎧",
    stock: 15,
  },
  {
    id: 2,
    title: "Montre connectée SmartWatch Pro",
    price: 45900,
    originalPrice: 55000,
    vendorName: "TechStore",
    rating: 4.5,
    reviewCount: 89,
    condition: "Neuf",
    category: "High-Tech",
    badge: "Promo",
    emoji: "⌚",
    stock: 8,
  },
  {
    id: 3,
    title: "T-shirt en coton bio",
    price: 8900,
    vendorName: "ModePlus",
    rating: 4.3,
    reviewCount: 45,
    condition: "Neuf",
    category: "Mode",
    badge: "Top Vendeur",
    emoji: "👕",
    stock: 32,
  },
  {
    id: 4,
    title: "Chaussures de sport femme",
    price: 18500,
    originalPrice: 22000,
    vendorName: "ModePlus",
    rating: 4.6,
    reviewCount: 67,
    condition: "Occasion",
    category: "Mode",
    badge: "Promo",
    emoji: "👟",
    stock: 5,
  },
  {
    id: 5,
    title: "Lampe de bureau LED",
    price: 12900,
    vendorName: "MaisonDesign",
    rating: 4.2,
    reviewCount: 34,
    condition: "Neuf",
    category: "Maison",
    badge: "Top Vendeur",
    emoji: "💡",
    stock: 20,
  },
  {
    id: 6,
    title: "Tapis de souris gaming RGB",
    price: 6500,
    originalPrice: 8000,
    vendorName: "TechStore",
    rating: 4.8,
    reviewCount: 156,
    condition: "Neuf",
    category: "High-Tech",
    badge: "Promo",
    emoji: "🖱️",
    stock: 0,
  },
  {
    id: 7,
    title: "Coussillon en soie",
    price: 3500,
    vendorName: "MaisonDesign",
    rating: 4.0,
    reviewCount: 23,
    condition: "Neuf",
    category: "Maison",
    badge: "Top Vendeur",
    emoji: "🛏️",
    stock: 18,
  },
  {
    id: 8,
    title: "Sac à dos vintage cuir",
    price: 29900,
    originalPrice: 35000,
    vendorName: "ModePlus",
    rating: 4.4,
    reviewCount: 52,
    condition: "Occasion",
    category: "Mode",
    badge: "Promo",
    emoji: "🎒",
    stock: 3,
  },
];

const CATEGORIES = ["Tous", "High-Tech", "Mode", "Maison"];
const CONDITIONS = ["Neuf", "Occasion"];
const SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence" },
  { value: "price_asc",   label: "Prix croissants" },
  { value: "price_desc",  label: "Prix décroissants" },
  { value: "rating",      label: "Meilleures notes" },
];

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : CARTE PRODUIT
   ═══════════════════════════════════════════════════════════ */
function ProductCard({ product, dark, onAddToCart, onToggleWishlist, inWishlist }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    onAddToCart(product);
    setTimeout(() => setAdded(false), 1500);
  };

  const badgeCls = product.badge === "Top Vendeur"
    ? "bg-amber-500/10 text-amber-600 border-amber-200"
    : "bg-red-500/10 text-red-600 border-red-200";

  const badgeIcon = product.badge === "Top Vendeur" ? <Award size={10} /> : <Sparkles size={10} />;

  return (
    <div
      className={`group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${
        dark
          ? "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-black/20"
          : "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200"
      }}`}
      onClick={() => {}}
    >
      {/* Zone image */}
      <div className="relative h-40 flex items-center justify-center bg-gray-50 overflow-hidden">
        <span className="text-4xl">{product.emoji || "📦"}</span>

        {/* Badge */}
        <span className={`absolute top-2 left-2 inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold border ${badgeCls}`}>
          {badgeIcon}
          {product.badge}
        </span>

        {/* Condition */}
        <span className={`absolute top-2 right-12 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium border ${
          product.condition === "Neuf"
            ? (dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
            : (dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200")
        }`}>
          {product.condition}
        </span>

        {/* Cœur wishlist */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            inWishlist
              ? "bg-red-500 text-white scale-110"
              : dark ? "bg-white/10 text-gray-400 hover:text-red-400 hover:bg-white/20" : "bg-white/80 text-gray-400 hover:text-red-400"
          }`}
          title={inWishlist ? "Retirer de la wishlist" : "Ajouter à la wishlist"}
        >
          <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Contenu */}
      <div className="p-4 space-y-2">
        <h3 className={`text-sm font-semibold line-clamp-1 ${dark ? "text-white" : "text-gray-900"}`}>
          {product.title}
        </h3>

        {/* Vendeur cliquable */}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className={`text-xs flex items-center gap-1 ${dark ? "text-gray-400 hover:text-emerald-400" : "text-gray-500 hover:text-emerald-600"}`}
        >
          <Tag size={10} />
          Vendu par : <span className="font-medium text-emerald-600">{product.vendorName}</span>
        </button>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <Star size={12} className="text-amber-400 fill-current" />
            <span className={`text-xs font-medium ${dark ? "text-white" : "text-gray-800"}`}>{product.rating.toFixed(1)}</span>
          </div>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>({product.reviewCount})</span>
        </div>

        {/* Prix */}
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{fmtFCFA(product.price)}</span>
          {product.originalPrice && (
            <span className={`text-sm line-through ${dark ? "text-gray-600" : "text-gray-400"}`}>
              {fmtFCFA(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Bouton Ajouter au panier */}
        <button
          onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          disabled={product.stock <= 0}
          className={`w-full mt-2 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            added
              ? "bg-emerald-600 text-white scale-105"
              : product.stock <= 0
              ? (dark ? "bg-slate-800 text-gray-500 border border-slate-700 cursor-not-allowed" : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed")
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg"
          }`}
        >
          {added ? (
            <>
              <CheckCircle2 size={16} />
              Ajouté !
            </>
          ) : product.stock <= 0 ? (
            "Rupture de stock"
          ) : (
            <>
              <ShoppingCart size={14} />
              Ajouter au panier
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL : CATALOGUE
   ═══════════════════════════════════════════════════════════ */
export default function Catalogue() {
  const { profile } = useAuth();
  const { add } = useCart();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();

  const [dark] = useState(localStorage.getItem("soubremarket_client_theme") === "dark");
  const [toast, setToast] = useState(null);

  // États de filtrage
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("soubremarket_wishlist") || "[]"); } catch { return []; }
  });

  // Charger le wishlist depuis localStorage
  useEffect(() => {
    localStorage.setItem("soubremarket_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Produits filtrés + triés
  const filteredProducts = useMemo(() => {
    let result = [...MOCK_PRODUCTS];

    // Catégorie
    if (activeCategory !== "Tous") {
      result = result.filter(p => p.category === activeCategory);
    }

    // Prix
    const min = priceMin ? Number(priceMin) : 0;
    const max = priceMax ? Number(priceMax) : Infinity;
    result = result.filter(p => p.price >= min && p.price <= max);

    // Condition
    if (selectedConditions.length > 0) {
      result = result.filter(p => selectedConditions.includes(p.condition));
    }

    // Note
    if (minRating > 0) {
      result = result.filter(p => p.rating >= minRating);
    }

    // Tri
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        result.sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [activeCategory, priceMin, priceMax, selectedConditions, minRating, sortBy]);

  const toggleCondition = (cond) => {
    setSelectedConditions(prev =>
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      const exists = prev.some(p => p.id === productId);
      const product = MOCK_PRODUCTS.find(p => p.id === productId);
      if (exists) {
        return prev.filter(p => p.id !== productId);
      }
      return [...prev, product];
    });
  };

  const handleAddToCart = (product) => {
    add(product);
    setToast({ message: product.title + " ajouté au panier ✓", type: "success" });
  };

  const resetFilters = () => {
    setActiveCategory("Tous");
    setPriceMin("");
    setPriceMax("");
    setSelectedConditions([]);
    setMinRating(0);
    setSortBy("relevance");
  };

  const activeFiltersCount = [
    activeCategory !== "Tous",
    priceMin,
    priceMax,
    selectedConditions.length > 0,
    minRating > 0,
    sortBy !== "relevance",
  ].filter(Boolean).length;

  const breadcrumb = activeCategory !== "Tous"
    ? [{ label: "Accueil", href: "/" }, { label: "Catalogue", href: "/catalogue" }, { label: activeCategory }]
    : [{ label: "Accueil", href: "/" }, { label: "Catalogue", href: "/catalogue" }];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-slate-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      {/* ─── Header avec message de bienvenue ─── */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 pt-6 pb-8">
        <p className="text-emerald-100 text-sm flex items-center gap-1">
          {getGreetingEmoji()} {getGreeting()}, {profile?.name?.split(" ")[0] || "cher client"} !
        </p>
        <h1 className="text-white text-2xl font-bold mt-1 mb-1">Bienvenue sur SoubreMarket</h1>
        <p className="text-emerald-200 text-xs italic mb-4">
          « Des produits locaux de qualité, livrés chez vous. »
        </p>

        {/* Barre de recherche */}
        <div className="relative">
          <input
            placeholder="🔍 Rechercher un produit..."
            className="w-full bg-white rounded-xl px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                const found = MOCK_PRODUCTS.find(p =>
                  p.title.toLowerCase().includes(e.target.value.toLowerCase())
                );
                if (found) {
                  window.location.href = `/catalogue?product=${found.id}`;
                }
              }
            }}
          />
        </div>

        {/* Accès rapides */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => nav("/accueil")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            <User size={14} />
            Mon espace client
          </button>
          <button
            onClick={() => nav("/accueil?tab=cart")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            <ShoppingCart size={14} />
            Mon panier
          </button>
        </div>
      </div>

      <div className="px-4 py-5">
        {/* ─── Toolbar : Breadcrumb + Compteur + Tri ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={12} className={dark ? "text-gray-600" : "text-gray-400"} />}
                {b.href ? (
                  <button
                    onClick={() => nav(b.href)}
                    className={`hover:underline ${dark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className={dark ? "text-gray-400" : "text-gray-500"}>{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Compteur + Tri */}
          <div className="flex items-center gap-3">
            <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
              <strong className="text-emerald-600">{filteredProducts.length}</strong> article{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}
            </span>

            <div className="flex items-center gap-1.5">
              <label className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Trier par :</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  dark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className={`text-xs inline-flex items-center gap-1 ${dark ? "text-gray-400 hover:text-emerald-400" : "text-gray-500 hover:text-emerald-600"}`}
                title="Réinitialiser les filtres"
              >
                <RefreshCw size={12} />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* ─── Sidebar Filtres (sticky) ─── */}
          <aside className="hidden xl:block xl:w-64 shrink-0">
            <div className={`rounded-2xl border p-4 sticky top-4 space-y-5 ${
              dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100 shadow-sm"
            }`}>
              {/* Réinitialiser en haut */}
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold uppercase ${dark ? "text-gray-400" : "text-gray-500"}`}>Filtres</h3>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={resetFilters}
                className={`text-xs w-full text-left ${dark ? "text-gray-400 hover:text-emerald-400" : "text-gray-500 hover:text-emerald-600"}`}
              >
                Réinitialiser les filtres
              </button>

              {/* Catégories */}
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Catégories</h4>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeCategory === cat
                          ? (dark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                          : (dark ? "text-gray-400 hover:text-white hover:bg-slate-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50")
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Filtre prix (F CFA)</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className={`w-1/2 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      dark ? "bg-slate-800 border-slate-700 text-white" : "border-gray-200 text-gray-900"
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className={`w-1/2 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      dark ? "bg-slate-800 border-slate-700 text-white" : "border-gray-200 text-gray-900"
                    }`}
                  />
                </div>
              </div>

              {/* État */}
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>État du produit</h4>
                <div className="space-y-1">
                  {CONDITIONS.map(cond => (
                    <label key={cond} className={`flex items-center gap-2 text-xs cursor-pointer ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      <input
                        type="checkbox"
                        checked={selectedConditions.includes(cond)}
                        onChange={() => toggleCondition(cond)}
                        className="w-3.5 h-3.5 rounded accent-emerald-600"
                      />
                      {cond === "Neuf" ? "Neuf" : "Occasion / Seconde main"}
                    </label>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Note vendeur</h4>
                <div className="space-y-1">
                  {[4, 3, 2, 1].map(star => (
                    <button
                      key={star}
                      onClick={() => setMinRating(star)}
                      className={`flex items-center gap-1 text-xs transition-all ${
                        minRating === star
                          ? (dark ? "text-emerald-400" : "text-emerald-600")
                          : (dark ? "text-gray-500 hover:text-emerald-400" : "text-gray-400 hover:text-emerald-600")
                      }`}
                    >
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= star ? "text-amber-400 fill-current" : (dark ? "text-gray-600" : "text-gray-300")}
                          />
                        ))}
                      </div>
                      <span>{star}★ et plus</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ─── Grille produits ─── */}
          <main className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className={`text-center py-20 rounded-2xl border ${
                dark ? "border-slate-800 text-gray-500" : "border-gray-100 text-gray-400"
              }`}>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className={`text-base font-semibold mb-1 ${dark ? "text-white" : "text-gray-800"}`}>
                  Aucun produit trouvé
                </h3>
                <p className="text-sm mb-6">Aucun produit ne correspond à vos filtres.</p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <RefreshCw size={16} />
                  Voir tous les produits
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    dark={dark}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={toggleWishlist}
                    inWishlist={wishlist.some(w => w.id === product.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
