import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";
import { useCart } from "../../hooks/useCart";
import ProductCard from "../../components/ProductCard";
import Toast from "../../components/Toast";

const CATS = ["Tous","Alimentation","Agriculture","Artisanat","Beauté","Électronique","Vêtements"];

export default function Catalogue() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [filter, setFilter] = useState(params.get("cat") || "Tous");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [priceMin, setMin]  = useState("");
  const [priceMax, setMax]  = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]   = useState(null);
  const { add } = useCart();

  const { products, loading } = useProducts({
    cat:    filter !== "Tous" ? filter : undefined,
    search: search || undefined,
    min:    priceMin || undefined,
    max:    priceMax || undefined,
    sort:   sortBy !== "default" ? sortBy : undefined,
  });

  const handleAdd = (product) => { add(product); setToast({ message: product.name + " ajouté au panier ✓", type:"success" }); };

  return (
    <div className="pb-24">
      {/* Barre de recherche */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex gap-2">
          <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <button onClick={() => setShowFilters(v=>!v)}
            className={`border rounded-lg px-3 py-2 text-sm transition-colors ${showFilters ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 text-gray-600"}`}>
            🎛
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prix min</label>
                <input type="number" placeholder="0" value={priceMin} onChange={e=>setMin(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prix max</label>
                <input type="number" placeholder="∞" value={priceMax} onChange={e=>setMax(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Trier</label>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="default">Défaut</option>
                  <option value="price_asc">Prix ↑</option>
                  <option value="price_desc">Prix ↓</option>
                  <option value="rating">Note ⭐</option>
                  <option value="popular">Populaires</option>
                </select>
              </div>
            </div>
            {(priceMin||priceMax||sortBy!=="default") && (
              <button onClick={()=>{setMin("");setMax("");setSortBy("default");}}
                className="mt-2 text-xs text-emerald-600 hover:underline">✕ Réinitialiser</button>
            )}
          </div>
        )}

        {/* Catégories */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {CATS.map(c=>(
            <button key={c} onClick={()=>setFilter(c)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter===c ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-xs text-gray-400 mb-3">{products.length} résultat{products.length>1?"s":""}</p>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-gray-100 animate-pulse rounded-xl h-48" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-sm">Aucun produit trouvé.</p>
            <button onClick={()=>{setFilter("Tous");setSearch("");}} className="mt-3 text-emerald-600 text-sm hover:underline">Réinitialiser</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} onAdd={() => handleAdd(p)} onClick={() => nav(`/client/produit/${p.id}`)} />)}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}