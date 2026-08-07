/**
 * Vendeurs — Page de gestion des vendeurs pour le superadmin.
 * Liste, filtre, active/désactive et approbation KYC.
 */
import { useEffect, useState, useCallback } from "react";
import { Admin } from "../../api/client";
import StatusBadge from "../../components/admin/StatusBadge";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default function Vendeurs() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | active | pending
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Admin.users({ type: "vendor" })
      .then(d => setVendors(d.users || []))
      .catch(err => setToast({ message: err.message, type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id, v) => {
    const prev = vendors.map(x => x.user_id === id ? { ...x, active: v } : x);
    setVendors(prev);
    try {
      await Admin.toggleUser(id, v);
      setToast({ message: v ? "Vendeur activé ✅" : "Vendeur désactivé", type: "success" });
    } catch (err) {
      load();
      setToast({ message: err.message, type: "error" });
    }
  };

  const filtered = vendors.filter(v => {
    if (filter === "active") return v.active;
    if (filter === "pending") return !v.active;
    return true;
  });

  const counts = {
    all: vendors.length,
    active: vendors.filter(v => v.active).length,
    pending: vendors.filter(v => !v.active).length,
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {toast.message}
          <button className="ml-3 float-right" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-50">Gestion des Vendeurs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gérez les inscriptions et comptes des marchands</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all", `Tous (${counts.all})`], ["active", `Actifs (${counts.active})`], ["pending", `En attente (${counts.pending})`]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${filter === k ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 border-slate-800 text-gray-400 hover:text-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Vendeur</th>
                <th className="px-3 py-3 font-medium">Boutique</th>
                <th className="px-3 py-3 font-medium">Téléphone</th>
                <th className="px-3 py-3 font-medium">Inscrit le</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                        {(v.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-400">{v.shop_name || "—"}</td>
                  <td className="px-3 py-3 text-gray-400">{v.phone || "—"}</td>
                  <td className="px-3 py-3 text-gray-400">{fmtDate(v.created_at)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={v.active ? "active" : "pending"} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5 justify-end">
                      {v.active ? (
                        <button
                          onClick={() => toggleActive(v.user_id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                        >
                          Désactiver
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleActive(v.user_id, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                        >
                          Activer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    {loading ? "Chargement..." : "Aucun vendeur trouvé"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}