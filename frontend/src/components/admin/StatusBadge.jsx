/**
 * StatusBadge — Badge de statut coloré et accessible.
 * Adapte automatiquement les couleurs selon le statut.
 */
const STATUS_PRESETS = {
  approved:   { label: "✅ Approuvé",  classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  delivered:  { label: "✅ Livré",     classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  paid:       { label: "💰 Payé",      classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  validated:  { label: "✅ Validé",    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  active:     { label: "🟢 Actif",     classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  success:    { label: "✓ Succès",     classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  pending:    { label: "⏳ En attente", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  delivering: { label: "🚚 En livraison", classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  processing: { label: "⚙️ Traitement", classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  preparing:  { label: "🧑‍🍳 En préparation", classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  awaiting:   { label: "⏳ En attente", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  awaiting_payment: { label: "💳 Paiement en attente", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  rejected:   { label: "❌ Refusé",    classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelled:  { label: "✖️ Annulé",    classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  refunded:   { label: "↩️ Remboursé", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  failed:     { label: "✖️ Échoué",    classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  suspended:  { label: "⏸ Suspendu",  classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  disputed:   { label: "⚠️ Litige",    classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  inactive:   { label: "⚪ Inactif",   classes: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  cash:       { label: "💵 Cash",      classes: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  card:       { label: "💳 Carte",     classes: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  mobile:     { label: "📱 Mobile Money", classes: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  wave:       { label: "🌊 Wave",      classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  orange_money:{ label: "🟠 Orange Money", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  pending_kyc:{ label: "🔍 KYC en cours", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  kyc_ok:     { label: "🛡 KYC validé", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  kyc_failed: { label: "🚫 KYC refusé", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function StatusBadge({ status, className = "" }) {
  const preset = STATUS_PRESETS[status?.toLowerCase()] || {
    label: status || "—",
    classes: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${preset.classes} ${className}`}>
      {preset.label}
    </span>
  );
}