/**
 * Moderation — Page de modération des commentaires et signalements.
 */
import { useEffect, useState, useCallback } from "react";
import { Admin } from "../../api/client";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default function Moderation() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Admin.comments(false)
      .then(d => setComments(d.comments || []))
      .catch(err => setToast({ message: err.message, type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      await Admin.approveComment(id);
      setComments(c => c.filter(x => x.id !== id));
      setToast({ message: "Commentaire approuvé ✅", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const remove = async (id) => {
    try {
      await Admin.deleteComment(id);
      setComments(c => c.filter(x => x.id !== id));
      setToast({ message: "Commentaire supprimé", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
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
        <h1 className="text-2xl font-bold text-slate-50">Modération</h1>
        <p className="text-sm text-gray-400 mt-0.5">Commentaires et signalements en attente de validation</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Commentaires en attente</h2>
          <p className="text-xs text-gray-500 mt-0.5">{comments.length} en attente de modération</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Auteur</th>
                <th className="px-3 py-3 font-medium">Produit</th>
                <th className="px-3 py-3 font-medium">Note</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Contenu</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-200">{c.user_name || "—"}</td>
                  <td className="px-3 py-3 text-gray-400">
                    <span className="mr-1">{c.products?.emoji || "📦"}</span>
                    {c.products?.name || "—"}
                  </td>
                  <td className="px-3 py-3 text-amber-400">{"★".repeat(c.rating || 0)}</td>
                  <td className="px-3 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                  <td className="px-3 py-3 text-gray-300 max-w-50 truncate">{c.text}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => approve(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    {loading ? "Chargement..." : "Aucun commentaire en attente 🎉"}
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