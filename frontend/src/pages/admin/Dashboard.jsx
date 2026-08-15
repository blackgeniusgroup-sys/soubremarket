import React, { useEffect, useState, useMemo } from "react";
import { Admin, Orders as OrdersAPI, Products as ProductsAPI, Livreurs as LivreursAPI } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import LiveDriverMap from "../../components/admin/LiveDriverMap";

const fmtFCFA = (n) => (Number(n) || 0).toLocaleString("fr-FR") + " F";
const fmtNum = (n) => (Number(n) || 0).toLocaleString("fr-FR");
const init = (name) => name?.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase() || "?";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

/* ============================================================
   COMPOSANTS UI
   ============================================================ */
const PillCard = ({ color="from-blue-600 to-blue-400", icon, label, value, sub }) => (
  <div className={`relative overflow-hidden rounded-full bg-gradient-to-r ${color} p-[2px] shadow-lg shadow-black/40`}>
    <div className="rounded-full bg-slate-950/90 backdrop-blur flex items-center gap-2 px-1.5 py-1.5">
      <span className="w-9 h-9 min-w-9 rounded-full bg-white/10 flex items-center justify-center text-lg shrink-0">{icon}</span>
      <div className="min-w-0 pr-3 py-0.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 truncate">{label}</p>
        <p className="text-lg font-bold text-white leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] text-gray-500 truncate">{sub}</p>}
      </div>
    </div>
  </div>
);

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

const Select = ({ label, children, ...props }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
    <select {...props} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
      {children}
    </select>
  </div>
);

/* ============================================================
   COMPOSANT PRINCIPAL — CRUD PROFESSIONNEL
   ============================================================ */
export default function AdminDashboard({ initialTab = "overview" }) {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.type === "superadmin";
  const [tab, setTab] = useState(initialTab);

  // Synchroniser l'onglet actif quand la route change (navigation sidebar)
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [productModal, setProductModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [zoneModal, setZoneModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [adminModal, setAdminModal] = useState(null);

  const loadAll = () => {
    Promise.all([
      Admin.stats().catch(()=>null),
      OrdersAPI.list({limit:50}).catch(()=>({orders:[]})),
      Admin.users({type:"vendor"}).catch(()=>({users:[]})),
      Admin.users({type:"client"}).catch(()=>({users:[]})),
      ProductsAPI.list({limit:50}).catch(()=>({products:[]})),
      LivreursAPI.list().catch(()=>({livreurs:[]})),
      Admin.zones().catch(()=>({zones:[]})),
      Admin.categories().catch(()=>({categories:[]})),
      Admin.admins().catch(()=>({admins:[]})),
      Admin.themes().catch(()=>({theme:"dark"})),
    ]).then(([s,o,v,cl,p,l,z,c,a,t])=>{
      if(s && Object.keys(s).length) setStats(s);
      setOrders(o?.orders || []);
      setVendors(v?.users || []);
      setClients(cl?.users || []);
      setProducts(p?.products || []);
      setLivreurs(l?.livreurs || []);
      setZones(z?.zones || []);
      setCategories(c?.categories || []);
      setAdmins(a?.admins || []);
      if(t?.theme) setTheme(t.theme);
    }).catch(()=>{});
  };

  useEffect(()=>{
    // Chargement initial
    loadAll();

    // Actualisation automatique toutes les 5 secondes (5000 ms)
    const interval = setInterval(() => {
      loadAll();
    }, 5000);

    // Nettoyage de l'intervalle au démontage du composant (prévient les fuites mémoire)
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type="success") => {
    setToast({ message: msg, type });
    setTimeout(()=>setToast(null), 3000);
  };

  /* ─── CRUD VENDEURS ─── */
  const toggleVendor = async (id, active) => {
    try {
      await Admin.toggleUser(id, active);
      setVendors(vs=>vs.map(v=>v.user_id===id?{...v, active}:v));
      showToast(active ? "Vendeur activé ✅" : "Vendeur désactivé");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── CRUD PRODUITS ─── */
  const saveProduct = async () => {
    if (!productModal?.name || !productModal?.price) { showToast("Nom et prix requis", "error"); return; }
    try {
      if (productModal.id) {
        await ProductsAPI.update(productModal.id, productModal);
        setProducts(ps=>ps.map(p=>p.id===productModal.id?{...p,...productModal}:p));
        showToast("Produit modifié ✅");
      } else {
        const created = await ProductsAPI.create(productModal);
        setProducts(ps=>[...ps, created]);
        showToast("Produit créé ✅");
      }
      setProductModal(null);
    } catch(e) { showToast(e.message, "error"); }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await ProductsAPI.update(id, { active: false });
      setProducts(ps=>ps.filter(p=>p.id!==id));
      showToast("Produit supprimé");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── CRUD COMMANDES ─── */
  const updateOrderStatus = async (id, status) => {
    try {
      await OrdersAPI.setStatus(id, status);
      setOrders(os=>os.map(o=>o.id===id?{...o, status}:o));
      showToast(`Commande ${status}`);
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── CRUD LIVREURS ─── */
  const toggleLivreur = async (id, active) => {
    try {
      await Admin.toggleUser(id, active);
      setLivreurs(ls=>ls.map(l=>l.user_id===id?{...l, active}:l));
      showToast(active ? "Livreur activé ✅" : "Livreur désactivé");
    } catch(e) { showToast(e.message, "error"); }
  };

  const approveLivreur = async (id) => {
    try {
      await LivreursAPI.setStatus(id, "approved");
      setLivreurs(ls=>ls.map(l=>l.user_id===id?{...l, status:"approved", active:true}:l));
      showToast("Livreur approuvé ✅");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── CRUD ZONES ─── */
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

  /* ─── CRUD CATÉGORIES ─── */
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

  /* ─── CRUD ADMINS ─── */
  const saveAdmin = async () => {
    if (!adminModal?.user_id || !adminModal?.name) { showToast("user_id et nom requis", "error"); return; }
    if (!adminModal?.id && (!adminModal?.password || adminModal.password.length < 8)) {
      showToast("Mot de passe requis (min 8 caractères)", "error");
      return;
    }
    try {
      if (adminModal.id) {
        await Admin.updateAdmin(adminModal.id, adminModal);
        setAdmins(as=>as.map(a=>a.user_id===adminModal.id?{...a,...adminModal}:a));
        showToast("Admin modifié ✅");
      } else {
        const created = await Admin.addAdmin(adminModal);
        setAdmins(as=>[...as, created]);
        showToast("Admin créé ✅");
      }
      setAdminModal(null);
    } catch(e) { showToast(e.message, "error"); }
  };

  const deleteAdmin = async (id) => {
    if (!confirm("Supprimer cet admin ?")) return;
    try {
      await Admin.deleteAdmin(id);
      setAdmins(as=>as.filter(a=>a.user_id!==id));
      showToast("Admin supprimé");
    } catch(e) { showToast(e.message, "error"); }
  };

  /* ─── THÈMES ─── */
  const saveTheme = async (newTheme) => {
    try {
      await Admin.saveTheme(newTheme);
      setTheme(newTheme);
      // Stocker localement et notifier le layout
      localStorage.setItem("soubremarket_theme", newTheme);
      window.dispatchEvent(new Event("theme:change"));
      showToast(`Thème "${newTheme}" appliqué ✅`);
    } catch(e) {
      // Même si l'API échoue, appliquer localement
      setTheme(newTheme);
      localStorage.setItem("soubremarket_theme", newTheme);
      window.dispatchEvent(new Event("theme:change"));
      showToast(`Thème "${newTheme}" appliqué (local) ✅`);
    }
  };

  /* ─── DÉRIVÉS ─── */
  const pendingVendors = vendors.filter(v=>!v.active);
  const gmv = stats?.total_gmv || 0;
  const tc = stats?.total_commission||0;
  const tv = stats?.total_vendors||0;
  const to = stats?.total_orders||0;
  const tcli = stats?.total_clients||0;
  const ad = stats?.active_deliveries||0;
  const pc = stats?.pending_comments||0;
  const pl = stats?.pending_livreurs||0;

  const TABS = [
    { key:"overview", label:"📊 Vue d'ensemble" },
    { key:"vendors", label:`🏪 Vendeurs (${vendors.length})` },
    { key:"clients", label:`👥 Clients (${clients.length})` },
    { key:"products", label:`📦 Produits (${products.length})` },
    { key:"orders", label:`🧾 Commandes (${orders.length})` },
    { key:"livreurs", label:`🛵 Livreurs (${livreurs.length})` },
    ...(isSuperAdmin ? [{ key:"admins", label:`👨‍💼 Admins (${admins.length})` }] : []),
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${toast.type==="success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {toast.message}
          <button className="ml-3 float-right" onClick={()=>setToast(null)}>✕</button>
        </div>
      )}

      {/* Onglets CRUD */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t=>(
          <button
            key={t.key}
            onClick={()=>setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${tab===t.key ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-slate-900 border-slate-800 text-gray-400 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ VUE D'ENSEMBLE ═══════════ */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <PillCard color="from-emerald-600 to-emerald-400" icon="💹" label="GMV Global" value={fmtFCFA(gmv)} sub="Volume d'affaires total" />
            <PillCard color="from-sky-600 to-sky-400" icon="💰" label="Revenus Plateforme" value={fmtFCFA(tc)} sub="Commissions nettes" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <PillCard color="from-blue-600 to-blue-400" icon="🏪" label="Vendeurs Actifs" value={fmtNum(tv)} sub="Total marchands" />
            <PillCard color="from-red-600 to-red-400" icon="🆕" label="Nouveaux Marchands" value={fmtNum(pendingVendors.length)} sub="Attente approbation" />
            <PillCard color="from-violet-600 to-violet-400" icon="🛒" label="Commandes" value={fmtNum(to)} sub="Volume total" />
            <PillCard color="from-indigo-700 to-indigo-500" icon="🛵" label="En livraison" value={fmtNum(ad)} sub="Commandes en cours" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <PillCard color="from-green-600 to-green-400" icon="👥" label="Clients inscrits" value={fmtNum(tcli)} sub="Comptes actifs" />
            <PillCard color="from-orange-600 to-orange-400" icon="🛍️" label="Panier Moyen" value={fmtFCFA(gmv/Math.max(to,1))} sub="Par commande" />
            <PillCard color="from-lime-600 to-lime-400" icon="💬" label="Avis en attente" value={fmtNum(pc)} sub="À modérer" />
            <PillCard color="from-amber-700 to-amber-500" icon="🚚" label="Livreurs en attente" value={fmtNum(pl)} sub="Validation requise" />
          </div>

          {/* ═══════════ SUIVI DES LIVREURS EN DIRECT ═══════════ */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">🛰️ Suivi des Livreurs en Direct</h2>
                <p className="text-xs text-gray-500 mt-0.5">Localisation temps réel et statut de la flotte</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Mise à jour auto 4s
              </span>
            </div>
            <LiveDriverMap />
          </div>
        </>
      )}

      {/* ═══════════ CRUD VENDEURS ═══════════ */}
      {tab === "vendors" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Gestion des Vendeurs</h2>
              <p className="text-xs text-gray-500 mt-0.5">Activer / désactiver les comptes marchands</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Vendeur</th>
                  <th className="px-3 py-3 font-medium">Boutique</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Inscrit</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v=>(
                  <tr key={v.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">{init(v.name)}</div>
                        <span className="font-medium text-slate-200">{v.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{v.shop_name||"—"}</td>
                    <td className="px-3 py-3 text-gray-400">{v.phone||"—"}</td>
                    <td className="px-3 py-3 text-gray-400">{fmtDate(v.created_at)}</td>
                    <td className="px-3 py-3">
                      {v.active ? <Badge type="success">Actif</Badge> : <Badge type="warning">En attente</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {v.active ? (
                          <button onClick={()=>toggleVendor(v.user_id, false)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Désactiver</button>
                        ) : (
                          <button onClick={()=>toggleVendor(v.user_id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20">Activer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD CLIENTS ═══════════ */}
      {tab === "clients" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">Gestion des Clients</h2>
            <p className="text-xs text-gray-500 mt-0.5">Liste des comptes clients</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Adresse</th>
                  <th className="px-3 py-3 font-medium">Inscrit</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c=>(
                  <tr key={c.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">{init(c.name)}</div>
                        <span className="font-medium text-slate-200">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{c.phone||"—"}</td>
                    <td className="px-3 py-3 text-gray-400">{c.address||"—"}</td>
                    <td className="px-3 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                    <td className="px-3 py-3">
                      {c.active ? <Badge type="success">Actif</Badge> : <Badge type="danger">Inactif</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {c.active ? (
                          <button onClick={()=>toggleVendor(c.user_id, false)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Désactiver</button>
                        ) : (
                          <button onClick={()=>toggleVendor(c.user_id, true)} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20">Activer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-500 text-sm">Aucun client trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD PRODUITS ═══════════ */}
      {tab === "products" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Gestion des Produits</h2>
              <p className="text-xs text-gray-500 mt-0.5">Créer, modifier, supprimer des produits</p>
            </div>
            <button onClick={()=>setProductModal({name:"", price:0, stock:0, category:"alimentation", emoji:"📦"})} className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/25">+ Nouveau produit</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Produit</th>
                  <th className="px-3 py-3 font-medium">Prix</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Catégorie</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p=>(
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{p.emoji||"📦"}</span>
                        <span className="font-medium text-slate-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(p.price)}</td>
                    <td className="px-3 py-3 text-gray-400">{p.stock}</td>
                    <td className="px-3 py-3 text-gray-400">{p.category}</td>
                    <td className="px-3 py-3">
                      {p.active ? <Badge type="success">Actif</Badge> : <Badge type="danger">Inactif</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>setProductModal(p)} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20">Modifier</button>
                        <button onClick={()=>deleteProduct(p.id)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD COMMANDES ═══════════ */}
      {tab === "orders" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">Gestion des Commandes</h2>
            <p className="text-xs text-gray-500 mt-0.5">Suivi et mise à jour du statut</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Vendeur</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                  <th className="px-3 py-3 font-medium">Commission</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o=>(
                  <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{o.orderNumber||o.order_number||o.id}</td>
                    <td className="px-3 py-3 text-gray-300">{o.client?.name||"—"}</td>
                    <td className="px-3 py-3 text-gray-300">{o.vendor?.name||"—"}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{fmtFCFA(o.total)}</td>
                    <td className="px-3 py-3 text-emerald-400">{fmtFCFA(o.commission)}</td>
                    <td className="px-3 py-3">
                      <Badge type={o.payStatus==="paid"?"success":o.payStatus==="pending"?"warning":"danger"}>{o.payStatus||o.status||"—"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>setOrderModal(o)} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20">Détails</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD LIVREURS ═══════════ */}
      {tab === "livreurs" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">Gestion des Livreurs</h2>
            <p className="text-xs text-gray-500 mt-0.5">Validation et activation des livreurs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Livreur</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Inscrit</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {livreurs.map(l=>(
                  <tr key={l.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">{init(l.name)}</div>
                        <span className="font-medium text-slate-200">{l.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{l.phone||"—"}</td>
                    <td className="px-3 py-3 text-gray-400">{fmtDate(l.created_at)}</td>
                    <td className="px-3 py-3">
                      {l.status==="approved" ? <Badge type="success">Approuvé</Badge> : <Badge type="warning">En attente</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {l.status!=="approved" && (
                          <button onClick={()=>approveLivreur(l.user_id)} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20">Approuver</button>
                        )}
                        {l.active ? (
                          <button onClick={()=>toggleLivreur(l.user_id, false)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Désactiver</button>
                        ) : (
                          <button onClick={()=>toggleLivreur(l.user_id, true)} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20">Activer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD ZONES ═══════════ */}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD CATÉGORIES ═══════════ */}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ CRUD ADMINS ═══════════ */}
      {tab === "admins" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Gestion des Admins</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ajouter, modifier, supprimer des comptes admin</p>
            </div>
            <button onClick={()=>setAdminModal({user_id:"", name:"", phone:""})} className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/25">+ Nouvel admin</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-medium">Nom</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a=>(
                  <tr key={a.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">{init(a.name)}</div>
                        <span className="font-medium text-slate-200">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{a.phone||"—"}</td>
                    <td className="px-3 py-3">{a.active ? <Badge type="success">Actif</Badge> : <Badge type="danger">Inactif</Badge>}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>setAdminModal(a)} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20">Modifier</button>
                        <button onClick={()=>deleteAdmin(a.user_id)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              { key:"dark", label:"Sombre", bg:"bg-slate-900", border:"border-slate-700" },
              { key:"light", label:"Clair", bg:"bg-gray-100", border:"border-gray-300" },
              { key:"blue", label:"Bleu", bg:"bg-blue-900", border:"border-blue-500" },
              { key:"emerald", label:"Émeraude", bg:"bg-emerald-900", border:"border-emerald-500" },
              { key:"purple", label:"Violet", bg:"bg-purple-900", border:"border-purple-500" },
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

      {/* ═══════════ MODALS ═══════════ */}

      {/* Modal Produit */}
      <Modal open={!!productModal} onClose={()=>setProductModal(null)} title={productModal?.id ? "Modifier le produit" : "Nouveau produit"}>
        {productModal && (
          <>
            <Input label="Nom du produit" value={productModal.name} onChange={e=>setProductModal({...productModal, name:e.target.value})} placeholder="Ex: Riz parfumé 5kg" />
            <Input label="Prix (FCFA)" type="number" value={productModal.price} onChange={e=>setProductModal({...productModal, price:Number(e.target.value)})} placeholder="Ex: 4500" />
            <Input label="Stock" type="number" value={productModal.stock} onChange={e=>setProductModal({...productModal, stock:Number(e.target.value)})} placeholder="Ex: 100" />
            <Select label="Catégorie" value={productModal.category} onChange={e=>setProductModal({...productModal, category:e.target.value})}>
              <option value="alimentation">Alimentation</option>
              <option value="vetements">Vêtements</option>
              <option value="electronique">Électronique</option>
              <option value="maison">Maison</option>
              <option value="beaute">Beauté</option>
              <option value="autres">Autres</option>
            </Select>
            <Input label="Emoji" value={productModal.emoji} onChange={e=>setProductModal({...productModal, emoji:e.target.value})} placeholder="📦" />
            <div className="flex gap-2 mt-4">
              <button onClick={saveProduct} className="flex-1 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/25">Enregistrer</button>
              <button onClick={()=>setProductModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-gray-300 border border-slate-700 text-sm font-medium hover:bg-slate-700">Annuler</button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Commande */}
      <Modal open={!!orderModal} onClose={()=>setOrderModal(null)} title="Détails de la commande">
        {orderModal && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">ID</span><span className="text-slate-200 font-mono">{orderModal.orderNumber||orderModal.id}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Client</span><span className="text-slate-200">{orderModal.client?.name||"—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Vendeur</span><span className="text-slate-200">{orderModal.vendor?.name||"—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Total</span><span className="text-slate-200 font-bold">{fmtFCFA(orderModal.total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Commission</span><span className="text-emerald-400">{fmtFCFA(orderModal.commission)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Date</span><span className="text-slate-200">{fmtDate(orderModal.created_at)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Statut</span><span className="text-slate-200">{orderModal.payStatus||orderModal.status||"—"}</span></div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{updateOrderStatus(orderModal.id, "delivering"); setOrderModal(null);}} className="flex-1 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25">En livraison</button>
              <button onClick={()=>{updateOrderStatus(orderModal.id, "delivered"); setOrderModal(null);}} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/25">Livrée</button>
            </div>
          </div>
        )}
      </Modal>

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
      <Modal open={!!categoryModal} onClose={()=>setCategoryModal(null)} title={categoryModal?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}>
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

      {/* Modal Admin */}
      <Modal open={!!adminModal} onClose={()=>setAdminModal(null)} title={adminModal?.id ? "Modifier l'admin" : "Nouvel admin"}>
        {adminModal && (
          <>
            <Input label="User ID" value={adminModal.user_id} onChange={e=>setAdminModal({...adminModal, user_id:e.target.value})} placeholder="UUID de l'utilisateur" />
            <Input label="Nom" value={adminModal.name} onChange={e=>setAdminModal({...adminModal, name:e.target.value})} placeholder="Ex: Jean Dupont" />
            <Input label="Téléphone" value={adminModal.phone} onChange={e=>setAdminModal({...adminModal, phone:e.target.value})} placeholder="+225 01 00 00 00" />
            {!adminModal.id && (
              <Input label="Mot de passe" type="password" value={adminModal.password} onChange={e=>setAdminModal({...adminModal, password:e.target.value})} placeholder="Mot de passe temporaire" />
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={saveAdmin} className="flex-1 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/25">Enregistrer</button>
              <button onClick={()=>setAdminModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-gray-300 border border-slate-700 text-sm font-medium hover:bg-slate-700">Annuler</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
