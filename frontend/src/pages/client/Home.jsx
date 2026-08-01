import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useProducts } from "../../hooks/useProducts";
import ProductCard from "../../components/ProductCard";

export default function ClientHome() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const { products: featured } = useProducts({ featured: true, limit: 6 });
  const { products: recent }   = useProducts({ limit: 4 });

  return (
    <div className="pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 pt-6 pb-8">
        <p className="text-emerald-100 text-sm">Bonjour, {profile?.name?.split(" ")[0]} 👋</p>
        <h1 className="text-white text-2xl font-bold mt-1 mb-1">Bienvenue sur<br/>SoubreMarket</h1>
        <p className="text-emerald-200 text-xs italic mb-4">« Achetez sans quitter le confort de votre maison. »</p>
        <div className="relative">
          <input placeholder="🔍 Rechercher un produit..." onClick={() => nav("/client/catalogue")}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm shadow-sm outline-none cursor-pointer" readOnly />
        </div>
      </div>

      <div className="px-4 py-5">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3 mb-6 -mt-6">
          {[["🛍️","Produits","200+"],["🏪","Vendeurs","12"],["🚀","Livraisons","1000+"]].map(([e,l,v])=>(
            <div key={l} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
              <div className="text-xl">{e}</div>
              <div className="text-sm font-semibold text-gray-800">{v}</div>
              <div className="text-xs text-gray-400">{l}</div>
            </div>
          ))}
        </div>

        {/* Catégories rapides */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Catégories</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[["🌾","Alimentation"],["🌿","Agriculture"],["🎨","Artisanat"],["✨","Beauté"],["📱","Électronique"],["👕","Vêtements"]].map(([e,l])=>(
              <button key={l} onClick={() => nav(`/client/catalogue?cat=${l}`)}
                className="flex-shrink-0 flex flex-col items-center bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2 gap-1 hover:border-emerald-300 transition-colors">
                <span className="text-xl">{e}</span>
                <span className="text-xs text-gray-600 whitespace-nowrap">{l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Produits à la Une */}
        {featured.length > 0 && (
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700">⭐ À la Une</h2>
              <button onClick={() => nav("/client/catalogue?featured=true")} className="text-emerald-600 text-xs">Voir tout</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {featured.map(p => (
                <div key={p.id} className="flex-shrink-0 w-36">
                  <ProductCard product={p} compact onClick={() => nav(`/client/catalogue?product=${p.id}`)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nouveautés */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-700">🆕 Nouveautés</h2>
            <button onClick={() => nav("/client/catalogue")} className="text-emerald-600 text-xs">Voir tout →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recent.map(p => <ProductCard key={p.id} product={p} onClick={() => nav(`/client/catalogue?product=${p.id}`)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}