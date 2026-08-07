/**
 * KpiCard — Carte de métrique KPI pour le dashboard superadmin.
 *
 * Props:
 *   label     — Libellé (ex: "GMV")
 *   value     — Valeur affichée (string ou number)
 *   icon      — Emoji ou élément React
 *   trend     — { value, positive } | null (variation %)
 *   trendData — Array de nombres pour sparkline
 *   alert     — Message d'alerte (ex: "3 en attente")
 *   danger    — true pour forcer le style rouge
 */
import { Sparkline } from "./Charts";

export default function KpiCard({ label, value, icon, trend, trendData = [], alert, danger = false }) {
  const hasTrend = trend && typeof trend.value === "number";
  const trendPositive = hasTrend ? trend.positive : null;
  const trendColor = danger
    ? "text-red-400"
    : trendPositive === null
      ? "text-gray-500"
      : trendPositive
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 ${danger ? "ring-1 ring-red-500/30" : ""}`}>
      {/* Icône */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-lg">
          {icon}
        </div>
        {hasTrend && (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${trendColor}`}>
              {trendPositive === null ? "" : trendPositive ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
            </span>
            <span className="text-[10px] text-gray-500">vs mois préc.</span>
          </div>
        )}
      </div>

      {/* Valeur */}
      <p className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">{value}</p>

      {/* Label */}
      <p className="text-xs text-gray-400 mt-1">{label}</p>

      {/* Alerte */}
      {alert && (
        <div className={`mt-3 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
          danger
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        }`}>
          {alert}
        </div>
      )}

      {/* Sparkline */}
      {trendData.length > 0 && (
        <div className="absolute bottom-3 right-3 opacity-60">
          <Sparkline data={trendData} color={danger ? "#f87171" : "#1D9E75"} />
        </div>
      )}
    </div>
  );
}