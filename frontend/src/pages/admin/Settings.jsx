import React, { useEffect, useState } from "react";
import { Admin } from "../../api/client";
import Toast from "../../components/Toast";

const THEMES = [
  { key:"green",  color:"#0F6E56", name:"Vert Forêt" },
  { key:"blue",   color:"#1A5FA8", name:"Bleu Océan" },
  { key:"orange", color:"#B85C00", name:"Orange Soleil" },
  { key:"purple", color:"#5C3A8A", name:"Violet Royal" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    Admin.settings().then(data => {
      const map = {};
      (data||[]).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    }).catch(console.error);
  }, []);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(settings).map(([key,value])=>({ key, value:String(value) }));
      await Admin.saveSettings(updates);
      setToast({ message:"Paramètres sauvegardés !", type:"success" });
    } catch (err) {
      setToast({ message:err.message, type:"error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 className="text-xl font-bold text-gray-800 mb-5">⚙️ Paramètres</h1>

      {/* Thème */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🎨 Thème de la plateforme</h2>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(t=>(
            <button key={t.key} onClick={()=>set("theme",t.key)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${settings.theme===t.key?"border-emerald-500 bg-emerald-50":"border-gray-200"}`}>
              <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background:t.color }} />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-800">{t.name}</div>
                {settings.theme===t.key&&<div className="text-xs text-emerald-600">✓ Actif</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Infos plateforme */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🏪 Informations de la plateforme</h2>
        <div className="space-y-3">
          {[["Nom de la plateforme","platform_name"],["Slogan","slogan"],["Ville / Province","city"],["Téléphone support","support_phone"]].map(([l,k])=>(
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-1">{l}</label>
              <input type="text" value={settings[k]||""} onChange={e=>set(k,e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Commission */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💰 Taux de commission</h2>
        <div className="flex gap-2">
          {[5,10,15,20].map(r=>(
            <button key={r} onClick={()=>set("commission_rate",String(r))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${settings.commission_rate===String(r)?"border-emerald-500 bg-emerald-50 text-emerald-700":"border-gray-200 text-gray-600"}`}>
              {r}%
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Prélevé automatiquement sur chaque vente.</p>
      </div>

      <button onClick={save} disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-base transition-all disabled:opacity-60 shadow-lg shadow-emerald-200">
        {loading ? "Sauvegarde..." : "💾 Sauvegarder tous les paramètres"}
      </button>
    </div>
  );
}