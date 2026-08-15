/**
 * Settings — Configuration Globale.
 * Zones de livraison, catégories, thèmes, paramètres généraux.
 */
import { useEffect, useState } from "react";
import { Admin } from "../../api/client";

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";

const Badge = ({ type, children }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    neutral: "bg-slate-700/30 text-slate-300 border-slate-600/30",
  };
  return <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${styles[type]||styles.neutral}`}>{children}</span>;
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
    <input {...props} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
  </div>
);

export default function AdminSettings() {
  const [tab, setTab] = useState("zones");
  const [settings, setSettings] = useState([]);
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState(null);

  // Modals
  const [zoneModal, setZoneModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ message: msg, type });
    setTimeout(()=>setToast(null), 3000);
  };

  const loadAll = () => {
    Promise.all([
      Admin.settings().catch(()=>[]),
      Admin.zones().catch(()=>({zones:[]})),
      Admin.categories().catch(()=>({categories:[]})),
      Admin.themes().catch(()=>({theme:"dark"})),
    ]).then(([s,z,c,t])=>{
      if(Array.isArray(s)) setSettings(s);
      setZones(z?.zones || []);
      setCategories(c?.categories || []);
      if(t?.theme) setTheme(t.theme);
    }).catch(()=>{});
  };

  useEffect(()=>{ loadAll(); }, []);

  const getSetting = (key, defaultValue = "") => {
    const s = settings.find(s => s.key === key);
    return s?.value ?? defaultValue;
  };

  const updateSetting = async (key, value) => {
    try {
      await Admin.saveSettings([{ key, value }]);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      showToast("Paramètre sauvegardé ✅");
    } catch (e) { showToast(e.message, "error"); }
  };

  /* ─── ZONES ─── */
  const saveZone = async () => {
    if (!zoneModal?.name) { showToast("Nom de zone requis", "error"); return; }
    try {
      if (zoneModal.id) {
        await Admin.updateZone(zoneModal.id, zoneModal);
        setZones(zs=>zs.map(z=>z.id===zoneModal.id?{...z,...zoneModal}:z));
        showToast("Zone modifiée ✅");
      } else {
        const created = await Admin.addZone(zoneModal);
        setZones(zs=>[...zs, created]);
        showToast("Zone créée ✅");
      }
      setZoneModal(null);
    } catch(e) { showToast(e.message, "error"); }
  };

  const deleteZone = async (id) => {
    if (!confirm("Supprimer cette zone ?")) return;
    try {
      await Admin.deleteZone(id);
      setZones(zs=>zs.filter(z=>z.id!==id));
      showToast("Zone supprimée");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── CATÉGORIES ─── */
  const saveCategory = async () => {
    if (!categoryModal?.name) { showToast("Nom de catégorie requis", "error"); return; }
    try {
      const created = await Admin.addCategory(categoryModal);
      setCategories(cs=>[...cs, created]);
      setCategoryModal(null);
      showToast("Catégorie créée ✅");
    } catch(e) { showToast(e.message, "error"); }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await Admin.deleteCategory(id);
      setCategories(cs=>cs.filter(c=>c.id!==id));
      showToast("Catégorie supprimée");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── THÈMES ─── */
  const saveTheme = async (newTheme) => {
    try {
      await Admin.saveTheme(newTheme);
      setTheme(newTheme);
      localStorage.setItem("soubremarket_theme", newTheme);
      window.dispatchEvent(new Event("theme:change"));
      showToast(`Thème "${newTheme}" appliqué ✅`);
    } catch(e) {
      setTheme(newTheme);
      localStorage.setItem("soubremarket_theme", newTheme);
      window.dispatchEvent(new Event("theme:change"));
      showToast(`Thème "${newTheme}" appliqué (local) ✅`);
    }
  };

  const TABS = [
    { key:"zones", label:"📍 Zones de livraison" },
    { key:"categories", label:"🏷️ Catégories" },
    { key:"themes", label:"🎨 Thèmes" },
    { key:"general", label:"⚙️ Paramètres généraux" },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${toast.type==="success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {toast.message}
          <button className="ml-3 float-right" onClick={()=>setToast(null)}>✕</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-50">Configuration Globale</h1>
        <p className="text-sm text-gray-400 mt-0.5">Zones, catégories, thèmes et paramètres de la plateforme</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t=>(
          <button
            key={t.key}
            onClick={()=>setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${tab===t.key ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : "bg-slate-900 border-slate-800 text-gray-400 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ ZONES ═══════════ */}
      {tab === "zones" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Zones de livraison</h2>
              <p className="text-xs text-gray-500 mt-0.5">Gérer les zones et tarifs de livraison</p>
            </div>
            <button onClick={()=>setZoneModal({name:"", max_km:0, price:0})} className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/25">+ Nouvelle zone</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Nom</th>
                  <th className="px-3 py-3 font-medium">Max km</th>
                  <th className="px-3 py-3 font-medium">Prix (FCFA)</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map(z=>(
                  <tr key={z.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-200">{z.name}</td>
                    <td className="px-3 py-3 text-gray-400">{z.max_km} km</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(z.price)}</td>
                    <td className="px-3 py-3">{z.active ? <Badge type="success">Active</Badge> : <Badge type="danger">Inactive</Badge>}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>setZoneModal(z)} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20">Modifier</button>
                        <button onClick={()=>deleteZone(z.id)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {zones.length === 0 && (
                  <tr><td colSpan="5" className="px-5 py-8 text-center text-gray-500 text-sm">Aucune zone définie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CATÉGORIES ═══════════ */}
      {tab === "categories" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Catégories de produits</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ajouter ou supprimer des catégories</p>
            </div>
            <button onClick={()=>setCategoryModal({name:"", emoji:"📦"})} className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/25">+ Nouvelle catégorie</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Emoji</th>
                  <th className="px-3 py-3 font-medium">Nom</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c=>(
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-lg">{c.emoji||"📦"}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>deleteCategory(c.id)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan="3" className="px-5 py-8 text-center text-gray-500 text-sm">Aucune catégorie définie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ THÈMES ═══════════ */}
      {tab === "themes" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">Thème de la plateforme</h2>
          <p className="text-xs text-gray-500 mb-4">Choisir le thème visuel du tableau de bord</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { key:"dark", label:"Sombre", bg:"bg-slate-900" },
              { key:"light", label:"Clair", bg:"bg-gray-100" },
              { key:"blue", label:"Bleu", bg:"bg-blue-900" },
              { key:"emerald", label:"Émeraude", bg:"bg-emerald-900" },
              { key:"purple", label:"Violet", bg:"bg-purple-900" },
            ].map(t=>(
              <button
                key={t.key}
                onClick={()=>saveTheme(t.key)}
                className={`p-4 rounded-2xl border-2 transition-all ${theme===t.key ? "border-white ring-2 ring-white/30" : "border-transparent hover:border-white/20"} ${t.bg}`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{t.key==="dark"?"🌙":t.key==="light"?"☀️":t.key==="blue"?"💙":t.key==="emerald"?"💚":"💜"}</div>
                  <div className="text-xs font-medium text-white">{t.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ PARAMÈTRES GÉNÉRAUX ═══════════ */}
      {tab === "general" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">💸 Frais de commission</h2>
            <div className="max-w-md">
              <label className="block text-xs font-medium text-gray-400 mb-1">Taux de commission (%)</label>
              <input
                type="number"
                value={getSetting("commission_rate", "10")}
                onChange={e => updateSetting("commission_rate", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">🚚 Frais de livraison</h2>
            <div className="max-w-md">
              <label className="block text-xs font-medium text-gray-400 mb-1">Frais de livraison par défaut (FCFA)</label>
              <input
                type="number"
                value={getSetting("delivery_fee", "2000")}
                onChange={e => updateSetting("delivery_fee", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">📞 Support client</h2>
            <div className="max-w-md space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Téléphone support</label>
                <input
                  type="text"
                  value={getSetting("support_phone", "")}
                  onChange={e => updateSetting("support_phone", e.target.value)}
                  placeholder="+225 01 00 00 00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email support</label>
                <input
                  type="email"
                  value={getSetting("support_email", "")}
                  onChange={e => updateSetting("support_email", e.target.value)}
                  placeholder="support@soubremarket.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">🔧 Maintenance</h2>
            <div className="max-w-md">
              <label className="block text-xs font-medium text-gray-400 mb-1">Mode maintenance</label>
              <select
                value={getSetting("maintenance_mode", "false")}
                onChange={e => updateSetting("maintenance_mode", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="false">Non (site accessible)</option>
                <option value="true">Oui (site en maintenance)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}

      {/* Modal Zone */}
      <Modal open={!!zoneModal} onClose={()=>setZoneModal(null)} title={zoneModal?.id ? "Modifier la zone" : "Nouvelle zone"}>
        {zoneModal && (
          <>
            <Input label="Nom de la zone" value={zoneModal.name} onChange={e=>setZoneModal({...zoneModal, name:e.target.value})} placeholder="Ex: Abidjan Nord" />
            <Input label="Max km" type="number" value={zoneModal.max_km} onChange={e=>setZoneModal({...zoneModal, max_km:Number(e.target.value)})} placeholder="Ex: 15" />
            <Input label="Prix (FCFA)" type="number" value={zoneModal.price} onChange={e=>setZoneModal({...zoneModal, price:Number(e.target.value)})} placeholder="Ex: 2000" />
            <div className="flex gap-2 mt-4">
              <button onClick={saveZone} className="flex-1 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/25">Enregistrer</button>
              <button onClick={()=>setZoneModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-gray-300 border border-slate-700 text-sm font-medium hover:bg-slate-700">Annuler</button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Catégorie */}
      <Modal open={!!categoryModal} onClose={()=>setCategoryModal(null)} title="Nouvelle catégorie">
        {categoryModal && (
          <>
            <Input label="Nom de la catégorie" value={categoryModal.name} onChange={e=>setCategoryModal({...categoryModal, name:e.target.value})} placeholder="Ex: Alimentation" />
            <Input label="Emoji" value={categoryModal.emoji} onChange={e=>setCategoryModal({...categoryModal, emoji:e.target.value})} placeholder="📦" />
            <div className="flex gap-2 mt-4">
              <button onClick={saveCategory} className="flex-1 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/25">Enregistrer</button>
              <button onClick={()=>setCategoryModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-gray-300 border border-slate-700 text-sm font-medium hover:bg-slate-700">Annuler</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}