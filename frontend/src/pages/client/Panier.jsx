import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { Zones } from "../../api/client";
import Toast from "../../components/Toast";

const FALLBACK_ZONES = [
  { id:1, name:"Centre-ville", maxKm:2, price:500 },
  { id:2, name:"Quartier Nord", maxKm:5, price:1000 },
  { id:3, name:"Quartier Sud", maxKm:10, price:1500 },
  { id:4, name:"Périphérie", maxKm:20, price:2500 },
  { id:5, name:"Zone rurale", maxKm:40, price:4000 },
];

export default function Panier() {
  const nav = useNavigate();
  const { items, add, remove, total, count, checkout, loading } = useCart();
  const [zones, setZones]     = useState(FALLBACK_ZONES);
  const [zone, setZone]       = useState(FALLBACK_ZONES[0]);
  const [payMode, setPayMode] = useState("cash");
  const [addr, setAddr]       = useState("");
  const [toast, setToast]     = useState(null);
  const cartItems = Object.values(items);
  const commission = Math.round(total * 0.1);
  const grandTotal = total + commission + (zone?.price || 0);

  useEffect(() => {
    Zones.list()
      .then(data => {
        const apiZones = data.zones || [];
        if (apiZones.length > 0) { setZones(apiZones); setZone(apiZones[0]); }
      })
      .catch(() => {});
  }, []);

  const handleCheckout = async () => {
    if (!addr.trim()) return setToast({ message:"Renseignez votre adresse de livraison","type":"error" });
    try {
      const order = await checkout({ zone_id: zone.id, delivery_addr: addr, pay_method: payMode });
      nav("/suivi?order=" + order.id);
    } catch (err) {
      setToast({ message: err.message, type:"error" });
    }
  };

  if (count === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 px-4">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-lg font-semibold text-gray-600 mb-2">Panier vide</h2>
      <p className="text-sm text-center mb-6">Ajoutez des produits depuis le catalogue pour passer commande.</p>
      <button onClick={() => nav("/catalogue")}
        className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700">
        Parcourir le catalogue
      </button>
    </div>
  );

  return (
    <div className="pb-32 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 className="text-lg font-bold text-gray-800 mb-4">🛒 Mon panier ({count})</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        {cartItems.map(({ product, qty }) => (
          <div key={product.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
            <span className="text-3xl">{product.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
              <p className="text-xs text-gray-400">{product.vendors?.shop_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => remove(product.id)} className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center text-lg leading-none hover:bg-gray-50">−</button>
              <span className="text-sm font-semibold w-4 text-center">{qty}</span>
              <button onClick={() => add(product)} className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg leading-none hover:bg-emerald-600">+</button>
            </div>
            <span className="text-sm font-bold text-emerald-700 ml-2 w-20 text-right">
              {(product.price * qty).toLocaleString("fr-FR")} F
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📍 Adresse de livraison</h2>
        <textarea value={addr} onChange={e=>setAddr(e.target.value)} rows={2}
          placeholder="Quartier, rue, repères pour trouver facilement..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Zone tarifaire</h3>
        <div className="grid grid-cols-3 gap-2">
          {zones.map(z => (
            <button key={z.id} onClick={() => setZone(z)}
              className={`rounded-xl p-2 text-center border transition-all ${zone?.id===z.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"}`}>
              <div className="text-xs font-semibold text-gray-800">{z.name}</div>
              <div className={`text-sm font-bold ${zone?.id===z.id?"text-emerald-600":"text-gray-600"}`}>{(z.price||0).toLocaleString("fr-FR")} F</div>
              <div className="text-xs text-gray-400">≤{z.maxKm || z.max} km</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💳 Mode de paiement</h2>
        <div className="grid grid-cols-2 gap-3">
          {[["cash","💵","Cash","À la livraison"],["wave","📱","Wave / OM","Paiement instantané"]].map(([m,ico,l,s])=>(
            <button key={m} onClick={()=>setPayMode(m)}
              className={`rounded-xl p-3 text-center border transition-all ${payMode===m ? "border-emerald-500 bg-emerald-50" : "border-gray-200"}`}>
              <div className="text-2xl mb-1">{ico}</div>
              <div className="text-xs font-semibold text-gray-800">{l}</div>
              <div className="text-xs text-gray-400">{s}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Récapitulatif</h2>
        {[["Sous-total", total],["Commission (10%)", commission],["Livraison", zone?.price || 0]].map(([k,v])=>(
          <div key={k} className="flex justify-between py-1 text-sm text-gray-500">
            <span>{k}</span><span>{(v||0).toLocaleString("fr-FR")} F</span>
          </div>
        ))}
        <div className="flex justify-between py-2 mt-1 border-t border-gray-100 text-base font-bold text-gray-800">
          <span>Total</span><span className="text-emerald-700">{grandTotal.toLocaleString("fr-FR")} F</span>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-white/90 backdrop-blur border-t border-gray-100">
        <button onClick={handleCheckout} disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-base shadow-lg transition-all disabled:opacity-60 active:scale-95">
          {loading ? "Traitement..." : `✅ Commander — ${grandTotal.toLocaleString("fr-FR")} F`}
        </button>
      </div>
    </div>
  );
}
