/**
 * ═══════════════════════════════════════════════════════════════
 *  RateLimitNotice — Notification discrète pour l'erreur 429
 *  Écoute l'événement `api:rate-limited` émis par le client API
 *  et affiche une petite notification non intrusive en bas à droite.
 *  Ne fait JAMAIS crasher l'interface.
 * ═══════════════════════════════════════════════════════════════
 */
import { useEffect, useState } from "react";

export default function RateLimitNotice() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { endpoint, message } = e.detail || {};
      setNotice({
        message: message || "Trop de requêtes, veuillez patienter quelques instants.",
        endpoint: endpoint || "",
        id: Date.now(),
      });
      // Auto-dismiss après 4 secondes
      setTimeout(() => setNotice(null), 4000);
    };

    window.addEventListener("api:rate-limited", handler);
    return () => window.removeEventListener("api:rate-limited", handler);
  }, []);

  if (!notice) return null;

  return (
    <div
      key={notice.id}
      className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-[fadeIn_0.3s_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl bg-slate-900/95 border border-amber-500/30 shadow-2xl shadow-black/50 backdrop-blur px-4 py-3">
        <span className="text-xl shrink-0">⏳</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-300">Requêtes trop fréquentes</p>
          <p className="text-xs text-gray-400 mt-0.5">{notice.message}</p>
          {notice.endpoint && (
            <p className="text-[10px] text-gray-500 mt-1 font-mono truncate">{notice.endpoint}</p>
          )}
        </div>
        <button
          onClick={() => setNotice(null)}
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors ml-2"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}