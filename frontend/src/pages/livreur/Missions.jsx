import React from "react";
import { useOrders } from "../../hooks/useOrders";
import { Orders } from "../../api/client";
import { useLivreurGPS } from "../../hooks/useLivreurGPS";
import Toast from "../../components/Toast";
import { useState } from "react";

export default function Missions() {
  const { orders, refetch } = useOrders({ status:"pending" });
  const [toast, setToast]   = useState(null);
  useLivreurGPS(true);

  const accept = async (orderId) => {
    try {
      await Orders.setStatus(orderId, "assigned");
      setToast({ message:"Mission acceptée !", type:"success" });
      refetch();
    } catch (err) {
      setToast({ message:err.message, type:"error" });
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 className="text-lg font-bold text-gray-800 mb-4">📦 Missions disponibles ({orders.length})</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-sm">Aucune mission disponible pour l'instant.</p>
        </div>
      ) : orders.map(o => (
        <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-gray-800">{o.order_number}</h3>
              <p className="text-xs text-gray-400">{o.created_at?.split("T")[0]} · {o.pay_method==="cash"?"💵 Cash":"📱 Wave"}</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">+{Math.round(o.total*0.1).toLocaleString("fr-FR")} F</span>
          </div>

          {/* Article */}
          <div className="bg-emerald-50 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1">📦 Article à livrer</p>
            <p className="text-sm font-medium text-gray-800">{o.items?.map(i=>i.name).join(", ")} · {o.total.toLocaleString("fr-FR")} F</p>
          </div>

          {/* Trajet */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">A</div>
              <div><p className="text-xs font-semibold text-emerald-700">Récupérer chez</p><p className="text-sm font-medium">{o.vendor_name}</p><p className="text-xs text-gray-500">📍 {o.vendor_address}</p></div>
            </div>
            <div className="border-l-2 border-dashed border-emerald-300 h-3 ml-3" />
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">B</div>
              <div><p className="text-xs font-semibold text-red-600">Livrer à</p><p className="text-sm font-medium">{o.client_name}</p><p className="text-xs text-gray-500">📍 {o.delivery_addr}</p><p className="text-xs text-gray-500">📞 {o.client_phone}</p></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => accept(o.id)}
              className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors">
              ✋ Accepter la mission
            </button>
            <a href={`https://wa.me/${o.client_phone}?text=Bonjour ${o.client_name}, je suis votre livreur SoubreMarket pour la commande ${o.order_number}`}
              target="_blank" rel="noreferrer"
              className="bg-green-500 text-white px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1 hover:bg-green-600">
              💬
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}