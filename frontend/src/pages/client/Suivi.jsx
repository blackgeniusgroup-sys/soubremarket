import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrderTracking, useOrders } from "../../hooks/useOrders";
import MapView from "../../components/MapView";

const STEPS = [
  { key:"pending",    ico:"🕐", label:"Reçue" },
  { key:"assigned",   ico:"🛵", label:"Livreur assigné" },
  { key:"picked",     ico:"📦", label:"Récupérée" },
  { key:"delivering", ico:"🚀", label:"En route" },
  { key:"delivered",  ico:"✅", label:"Livrée" },
];
const STEP_IDX = ["pending","assigned","picked","delivering","delivered"];

export default function Suivi() {
  const [params] = useSearchParams();
  const { orders } = useOrders();
  const [selectedId, setSelectedId] = useState(params.get("order") || orders[0]?.id);
  const { order, livreurPos } = useOrderTracking(selectedId);
  const stepIdx = order ? STEP_IDX.indexOf(order.status) : 0;

  return (
    <div className="pb-20 px-4 py-4">
      <h1 className="text-lg font-bold text-gray-800 mb-4">📍 Suivi de livraison</h1>

      {/* Sélecteur de commande */}
      {orders.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Sélectionner une commande</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {orders.map(o=>(
              <button key={o.id} onClick={()=>setSelectedId(o.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedId===o.id?"bg-emerald-600 text-white border-emerald-600":"border-gray-200 text-gray-600"}`}>
                {o.order_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {order ? (
        <>
          {/* Barre de progression */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{order.order_number}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${order.status==="delivered"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                {order.status==="delivered"?"Livré ✓":"En cours"}
              </span>
            </div>
            <div className="flex items-center">
              {STEPS.map((step,i)=>(
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${i<=stepIdx?"bg-emerald-500 border-emerald-500 text-white shadow-md":"bg-white border-gray-200 text-gray-400"} ${i===stepIdx?"ring-2 ring-emerald-200 scale-110":""}`}>
                      {i<=stepIdx ? (i===stepIdx?step.ico:"✓") : i+1}
                    </div>
                    <span className={`text-xs mt-1 text-center max-w-12 leading-tight ${i<=stepIdx?"text-emerald-700 font-medium":"text-gray-400"}`}>{step.label}</span>
                  </div>
                  {i<STEPS.length-1&&<div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all ${i<stepIdx?"bg-emerald-500":"bg-gray-200"}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Carte */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
            <MapView livreurPos={livreurPos} />
            {order.status==="delivering"&&(
              <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">🛵 Votre livreur est en route · Arrivée estimée ~15 min</p>
              </div>
            )}
            {order.status==="delivered"&&(
              <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <p className="text-sm text-green-700 font-medium">Livraison effectuée ! Merci d'utiliser SoubreMarket.</p>
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Détails de la commande</h3>
            {[
              ["Produit", order.items?.map(i=>i.name).join(", ") || "—"],
              ["Adresse", order.delivery_addr || "—"],
              ["Livreur", order.livreur_name || "En attente d'assignation"],
              ["Paiement", order.pay_method==="cash"?"💵 Cash":"📱 Wave / OM"],
              ["Total", (order.total||0).toLocaleString("fr-FR")+" F"],
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium text-gray-700 text-right max-w-48">{v}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm">Aucune commande à suivre.</p>
        </div>
      )}
    </div>
  );
}