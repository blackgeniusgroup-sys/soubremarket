/**
 * Commandes — Page de gestion des commandes globales pour le superadmin.
 */
import { useEffect, useState, useCallback } from "react";
import { Orders as OrdersAPI } from "../../api/client";
import StatusBadge from "../../components/admin/StatusBadge";

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default function Commandes() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    OrdersAPI.list({ limit: 50 })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => filter === "all" || (o.status || o.pay_status) === filter);

  const statuses = ["all", "pending", "delivering", "delivered", "cancelled"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Commandes & Paniers</h1>
        <p className="text-sm text-gray-400 mt-0.5">Suivi global des transactions</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${filter === s ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 border-slate-800 text-gray-400 hover:text-slate-200"}`}
          >
            {s === "all" ? "Toutes" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Vendeur</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Commission</th>
                <th className="px-3 py-3 font-medium">Paiement</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">{o.orderNumber || o.order_number || "—"}</td>
                  <td className="px-3 py-3 text-gray-300">{o.client?.name || "—"}</td>
                  <td className="px-3 py-3 text-gray-300">{o.vendor?.name || "—"}</td>
                  <td className="px-3 py-3 text-gray-400">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(o.total)}</td>
                  <td className="px-3 py-3 text-emerald-400">{fmtFCFA(o.commission)}</td>
                  <td className="px-3 py-3"><StatusBadge status={o.payMethod || o.pay_method || "cash"} /></td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-gray-500">
                    {loading ? "Chargement..." : "Aucune commande trouvée"}
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