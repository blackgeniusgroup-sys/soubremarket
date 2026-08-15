/**
 * Finances — Page de suivi financier et commissions pour le superadmin.
 * Toutes les données proviennent de la base de données via l'API.
 * Aucune donnée mockée.
 */
import { useEffect, useState, useMemo } from "react";
import { Admin, Orders as OrdersAPI } from "../../api/client";
import KpiCard from "../../components/admin/KpiCard";
import StatusBadge from "../../components/admin/StatusBadge";

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default function Finances() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      Admin.stats(),
      OrdersAPI.list({ limit: 50 }),
    ])
      .then(([s, o]) => {
        if (!mounted) return;
        setStats(s);
        setOrders(o.orders || []);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || "Erreur lors du chargement des données financières");
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const delivered = useMemo(() => orders.filter(o => o.status === "delivered"), [orders]);

  // GMV et commission provenant de la somme serveur (stats) — source unique de vérité
  const totalCommission = stats?.total_commission || 0;
  const totalGmv = stats?.total_gmv || 0;
  const deliveredCount = delivered.length;
  const avgCommission = deliveredCount > 0 ? totalCommission / deliveredCount : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-sm text-gray-400">Chargement des données financières...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Finances & Commissions</h1>
        <p className="text-sm text-gray-400 mt-0.5">Suivi des revenus de la plateforme</p>
      </div>

      {/* KPIs financiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Revenus plateforme"
          value={fmtFCFA(totalCommission)}
          icon="💰"
        />
        <KpiCard
          label="Volume d'affaires (GMV)"
          value={fmtFCFA(totalGmv)}
          icon="💹"
        />
        <KpiCard
          label="Commandes livrées"
          value={deliveredCount}
          icon="✅"
        />
        <KpiCard
          label="Commission moyenne"
          value={deliveredCount ? fmtFCFA(Math.round(avgCommission)) : "—"}
          icon="📊"
        />
      </div>

      {/* Table des commissions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Détail des commissions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Commandes livrées récentes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Vendeur</th>
                <th className="px-3 py-3 font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Commission</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {delivered.map(o => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">{o.orderNumber || o.order_number || "—"}</td>
                  <td className="px-3 py-3 text-gray-400">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-3 text-gray-300">{o.vendor?.name || "—"}</td>
                  <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(o.total)}</td>
                  <td className="px-3 py-3 text-emerald-400 font-medium">{fmtFCFA(o.commission)}</td>
                  <td className="px-5 py-3"><StatusBadge status="delivered" /></td>
                </tr>
              ))}
              {delivered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    Aucune commission enregistrée
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
