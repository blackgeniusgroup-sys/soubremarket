/**
 * Produits — Catalogue global pour le superadmin.
 */
import { useEffect, useState, useCallback } from "react";
import { Products } from "../../api/client";
import StatusBadge from "../../components/admin/StatusBadge";

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";

export default function Produits() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Products.list({ limit: 50 })
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    !search || (p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Catalogue Global</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tous les produits de la plateforme</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un produit..."
          className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Produit</th>
                <th className="px-3 py-3 font-medium">Catégorie</th>
                <th className="px-3 py-3 font-medium">Prix</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Ventes</th>
                <th className="px-3 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.emoji || "📦"}</span>
                      <span className="font-medium text-slate-200">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-400">{p.category || "—"}</td>
                  <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(p.price)}</td>
                  <td className="px-3 py-3 text-gray-400">{p.stock ?? "—"}</td>
                  <td className="px-3 py-3 text-gray-400">{p.total_sales ?? 0}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={p.active ? "active" : "inactive"} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    {loading ? "Chargement..." : "Aucun produit trouvé"}
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