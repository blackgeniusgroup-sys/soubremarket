import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useProducts } from "../../hooks/useProducts";
import OrderRow from "../../components/OrderRow";

export default function VendorDashboard() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { orders } = useOrders();
  const { products } = useProducts();

  const totalVentes = orders.reduce((s,o)=>s+o.total,0);
  const commission  = Math.round(totalVentes*0.1);
  const netPercu    = totalVentes - commission;

  return (
    <div className="pb-24 px-4 py-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Bonjour 👋</h1>
          <p className="text-sm text-gray-500">{profile?.name}</p>
        </div>
        <button onClick={() => nav("/vendor/publier")}
          className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors">
          + Publier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          ["Ventes du mois", totalVentes.toLocaleString("fr-FR")+" F", "text-emerald-700", "bg-emerald-50"],
          ["Commandes", orders.length+" total", "text-blue-700", "bg-blue-50"],
          ["Commission (10%)", commission.toLocaleString("fr-FR")+" F", "text-amber-700", "bg-amber-50"],
          ["Net perçu", netPercu.toLocaleString("fr-FR")+" F", "text-purple-700", "bg-purple-50"],
        ].map(([l,v,tc,bg])=>(
          <div key={l} className={`${bg} rounded-2xl p-4 border border-white`}>
            <p className="text-xs text-gray-500 mb-1">{l}</p>
            <p className={`text-lg font-bold ${tc}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Dernières commandes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Dernières commandes</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${orders.filter(o=>o.status==="pending").length>0?"bg-red-100 text-red-600":"bg-gray-100 text-gray-400"}`}>
            {orders.filter(o=>o.status==="pending").length} en attente
          </span>
        </div>
        {orders.slice(0,5).map(o=><OrderRow key={o.id} order={o} />)}
        {orders.length===0&&<p className="text-sm text-gray-400 text-center py-4">Aucune commande pour l'instant.</p>}
      </div>

      {/* Mes produits */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Mes produits ({products.length})</h2>
          <button onClick={() => nav("/vendor/publier")} className="text-emerald-600 text-xs hover:underline">+ Nouveau</button>
        </div>
        {products.slice(0,5).map(p=>(
          <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-2xl">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}
                {p.featured&&<span className="ml-1 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">★ Une</span>}
              </p>
              <p className="text-xs text-gray-400">Stock: {p.stock} · {p.total_sales} ventes</p>
            </div>
            <span className="text-sm font-bold text-emerald-700">{p.price.toLocaleString("fr-FR")} F</span>
          </div>
        ))}
      </div>
    </div>
  );
}