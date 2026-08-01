import React, { useEffect, useState } from "react";
import { Admin, Orders as OrdersAPI } from "../../api/client";
import OrderRow from "../../components/OrderRow";

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    Admin.stats().then(setStats).catch(console.error);
    OrdersAPI.list({ limit:10 }).then(d=>setOrders(d.orders||[])).catch(console.error);
  }, []);

  const statCards = stats ? [
    ["💰", "Revenus", (+(stats.total_commission||0)).toLocaleString("fr-FR")+" F", "bg-emerald-50 border-emerald-200"],
    ["👤", "Clients", stats.total_clients, "bg-blue-50 border-blue-200"],
    ["🏪", "Vendeurs", stats.total_vendors, "bg-purple-50 border-purple-200"],
    ["🛵", "Livreurs actifs", stats.total_livreurs, "bg-orange-50 border-orange-200"],
    ["📦", "Commandes", stats.total_orders, "bg-gray-50 border-gray-200"],
    ["🛵", "En livraison", stats.active_deliveries, "bg-yellow-50 border-yellow-200"],
    ["💬", "Avis en attente", stats.pending_comments, "bg-red-50 border-red-200"],
    ["⏳", "Livreurs en attente", stats.pending_livreurs, "bg-pink-50 border-pink-200"],
  ] : [];

  return (
    <div className="pb-24 px-4 py-4">
      <h1 className="text-xl font-bold text-gray-800 mb-5">⚙️ Vue globale</h1>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map(([ico,l,v,cls])=>(
          <div key={l} className={`rounded-2xl border p-3.5 ${cls}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{ico}</span>
              <span className="text-xs text-gray-500">{l}</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{stats?v:"—"}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Activité récente</h2>
        {orders.map(o=><OrderRow key={o.id} order={o} extended />)}
        {orders.length===0&&<p className="text-sm text-gray-400 text-center py-4">Aucune commande.</p>}
      </div>
    </div>
  );
}