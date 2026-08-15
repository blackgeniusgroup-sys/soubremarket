import React, { useCallback, useEffect, useState } from "react";
import { Livreurs as LivreursAPI } from "../../api/client";
import Toast from "../../components/Toast";

const STATUS_STYLE = {
  pending:  { bg:"bg-amber-100",  text:"text-amber-700",  label:"⏳ En attente" },
  approved: { bg:"bg-green-100",  text:"text-green-700",  label:"✅ Approuvé" },
  rejected: { bg:"bg-red-100",    text:"text-red-700",    label:"❌ Refusé" },
  suspended:{ bg:"bg-gray-100",   text:"text-gray-600",   label:"⏸ Suspendu" },
};

export default function AdminLivreurs() {
  const [livreurs, setLivreurs] = useState([]);
  const [note, setNote]         = useState({});
  const [toast, setToast]       = useState(null);
  const [filter, setFilter]     = useState("pending");

  const loadLivreurs = useCallback(() => {
    LivreursAPI.list({ status: filter }).then(d=>setLivreurs(d.livreurs||[])).catch(console.error);
  }, [filter]);
  useEffect(() => {
    // Chargement initial
    loadLivreurs();

    // Actualisation automatique toutes les 30 secondes (30000 ms)
    const interval = setInterval(() => {
      loadLivreurs();
    }, 30000);

    // Nettoyage de l'intervalle au démontage du composant (prévient les fuites mémoire)
    return () => clearInterval(interval);
  }, [loadLivreurs]);

  const handle = async (id, status) => {
    try {
      await LivreursAPI.setStatus(id, status, note[id]);
      setToast({ message: status==="approved"?"Livreur approuvé ✅":"Décision enregistrée", type:"success" });
      loadLivreurs();
    } catch (err) {
      setToast({ message:err.message, type:"error" });
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 className="text-xl font-bold text-gray-800 mb-4">🛵 Gestion livreurs</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["pending","approved","rejected","suspended"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter===s?"bg-gray-800 text-white border-gray-800":"border-gray-200 text-gray-600"}`}>
            {STATUS_STYLE[s].label}
          </button>
        ))}
      </div>

      {livreurs.length === 0 && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">🛵</div><p className="text-sm">Aucun livreur dans cette catégorie.</p></div>}

      {livreurs.map(l => {
        const st = STATUS_STYLE[l.status] || STATUS_STYLE.pending;
        const adminNote = l.adminNote || l.admin_note;
        const livreurKey = l.user_id || l.userId;
        return (
          <div key={livreurKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-3xl border-2 border-gray-200 overflow-hidden shrink-0">
                {(l.photoUrl || l.photo_url) ? <img src={l.photoUrl || l.photo_url} alt="" className="w-full h-full object-cover" /> : "🧑"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">{l.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-500">{l.vehicule || "—"} · Zone {l.zoneTravail || l.zone_travail || "—"}</p>
                <p className="text-xs text-gray-500">📞 {l.phone || "—"}</p>
              </div>
            </div>

            {/* Documents fournis */}
            {(l.permis || l.permis_recto_url || l.permis_verso_url || l.cni_url || l.cniUrl) && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">📋 Documents fournis</p>
                <div className="flex flex-wrap gap-2">
                  {l.permis && (
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${l.permis === "oui" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      🪪 Permis : {l.permis === "oui" ? "Oui" : "Non"}
                    </span>
                  )}
                  {(l.permis_recto_url || l.permisRectoUrl) && (
                    <a href={l.permis_recto_url || l.permisRectoUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium hover:bg-amber-200">
                      📄 Permis recto
                    </a>
                  )}
                  {(l.permis_verso_url || l.permisVersoUrl) && (
                    <a href={l.permis_verso_url || l.permisVersoUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium hover:bg-amber-200">
                      📄 Permis verso
                    </a>
                  )}
                  {(l.cni_url || l.cniUrl) && (
                    <a href={l.cni_url || l.cniUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200">
                      🪪 CNI / Passeport
                    </a>
                  )}
                </div>
              </div>
            )}

            {adminNote && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-3">📝 {adminNote}</div>
            )}

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Note admin (optionnelle)</label>
              <input type="text" placeholder="Ex: Documents vérifiés..." value={note[livreurKey]||""}
                onChange={e=>setNote(n=>({...n,[livreurKey]:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {l.status!=="approved"&&(
                <button onClick={()=>handle(livreurKey,"approved")}
                  className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-emerald-700">✅ Approuver</button>
              )}
              {l.status!=="rejected"&&(
                <button onClick={()=>handle(livreurKey,"rejected")}
                  className="flex-1 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold py-2 rounded-xl hover:bg-red-100">❌ Refuser</button>
              )}
              {l.status==="approved"&&(
                <button onClick={()=>handle(livreurKey,"suspended")}
                  className="flex-1 bg-gray-100 text-gray-600 border border-gray-200 text-sm font-semibold py-2 rounded-xl hover:bg-gray-200">⏸ Suspendre</button>
              )}
              <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer"
                className="bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-semibold">💬</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}