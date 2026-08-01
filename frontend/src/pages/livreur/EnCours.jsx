import React, { useState } from "react";
import { useOrders } from "../../hooks/useOrders";
import { Orders } from "../../api/client";
import MapView from "../../components/MapView";
import Toast from "../../components/Toast";

const STEP_ORDER = ["assigned","picked","delivering","delivered"];
const STEP_LABEL = { assigned:"✋ Acceptée", picked:"📦 Récupérée", delivering:"🛵 En route", delivered:"✅ Livrée" };
const NEXT_ACTION = {
  assigned:   { label:"✅ Articles récupérés", next:"picked",     color:"bg-blue-600" },
  picked:     { label:"🛵 En route !",          next:"delivering", color:"bg-orange-500" },
  delivering: { label:"🎉 Livraison confirmée", next:"delivered",  color:"bg-emerald-600" },
};

export default function EnCours() {
  const { orders, refetch } = useOrders();
  const active = orders.filter(o => ["assigned","picked","delivering"].includes(o.status));
  const [toast, setToast] = useState(null);

  const updateStatus = async (orderId, status) => {
    try {
      await Orders.setStatus(orderId, status);
      setToast({ message: status==="delivered"?"🎉 Livraison confirmée !":"Statut mis à jour ✓", type:"success" });
      refetch();
    } catch (err) {
      setToast({ message:err.message, type:"error" });
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 className="text-lg font-bold text-gray-800 mb-4">🛵 Livraisons en cours ({active.length})</h1>

      {active.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🛵</div>
          <p className="text-sm">Aucune livraison en cours.<br/>Acceptez des missions depuis l'onglet Missions.</p>
        </div>
      ) : active.map(o => {
        const curIdx = STEP_ORDER.indexOf(o.status);
        const action = NEXT_ACTION[o.status];
        return (
          <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-800">{o.order_number}</h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">{STEP_LABEL[o.status]}</span>
            </div>

            {/* Progression */}
            <div className="flex items-center mb-4">
              {STEP_ORDER.map((s,i)=>(
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i<=curIdx?"bg-emerald-500 border-emerald-500 text-white":"bg-white border-gray-200 text-gray-400"} ${i===curIdx?"ring-2 ring-emerald-200 scale-110":""}`}>
                    {i<curIdx?"✓":i===curIdx?["✋","📦","🛵","✅"][i]:i+1}
                  </div>
                  {i<STEP_ORDER.length-1&&<div className={`flex-1 h-0.5 ${i<curIdx?"bg-emerald-500":"bg-gray-200"}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Carte mini */}
            <div className="rounded-xl overflow-hidden mb-3 h-40">
              <MapView compact />
            </div>

            {/* Infos client */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
              <div className="grid grid-cols-2 gap-1">
                {[["Client",o.client_name],["Tél",o.client_phone],["Adresse",o.delivery_addr],["Paiement",o.pay_method==="cash"?"💵 Cash":"📱 Wave"]].map(([k,v])=>(
                  <div key={k} className={k==="Adresse"?"col-span-2":""}>
                    <span className="text-gray-400 text-xs">{k} : </span>
                    <span className="font-medium text-gray-800">{v||"—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {action && (
                <button onClick={() => updateStatus(o.id, action.next)}
                  className={`flex-1 ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity`}>
                  {action.label}
                </button>
              )}
              <a href={`https://wa.me/${o.client_phone}`} target="_blank" rel="noreferrer"
                className="bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">💬</a>
              <a href={`tel:${o.client_phone}`}
                className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold">📞</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}