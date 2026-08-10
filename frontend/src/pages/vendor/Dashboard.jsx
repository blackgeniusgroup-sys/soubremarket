import React, { useEffect, useState } from "react";
import { Products, Orders } from "../../api/client";
import Toast from "../../components/Toast";

export default function VendorDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    Products.list({ limit: 100 }).then(d => setProducts(d.products || [])).catch(console.error);
    Orders.list({ limit: 10 }).then(d => setOrders(d.orders || [])).catch(console.error);
  }, []);

  const stats = [
    ["📦", "Produits", products.length, "bg-blue-50 border-blue-200"],
    ["🛒", "Commandes", orders.length, "bg-emerald-50 border-emerald-200"],
    ["⏳", "En attente", orders.filter(o => o.status === "pending").length, "bg-amber-50 border-amber-200"],
    ["✅", "Livrées", orders.filter(o => o.status === "delivered").length, "bg-green-50 border-green-200"],
  ];

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-xl font-bold text-gray-800 mb-5">📊 Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(([ico, label, value, cls]) => (
          <div key={label} className={`rounded-2xl border p-3.5 ${cls}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{ico}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📦 Mes produits</h2>
        {products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun produit. Publiez votre premier produit !</p>
        ) : (
          <div className="space-y-2">
            {products.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">Stock: {p.stock} · {p.price?.toLocaleString("fr-FR")} F</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🛒 Commandes récentes</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucune commande pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{o.order_number}</p>
                  <p className="text-xs text-gray-400">{o.orderItems?.length || 0} article(s)</p>
                </div>
                <span className="text-sm font-bold text-emerald-700">{o.total?.toLocaleString("fr-FR")} F</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}