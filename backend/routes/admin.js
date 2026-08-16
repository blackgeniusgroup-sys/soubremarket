const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const prisma  = require("../services/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getKpis } = require("../services/kpiService");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

// Toutes les routes admin nécessitent le rôle admin ou superadmin
router.use(requireAuth, requireRole("admin", "superadmin"));

// GET /api/admin/stats — KPIs ROBUSTES avec fallbacks (ne renvoie JAMAIS d'erreur)
router.get("/stats", async (req, res) => {
  try {
    const stats = await getKpis();
    // Toujours retourner 200 avec les fallbacks — le frontend s'affiche toujours
    return res.json(stats);
  } catch (err) {
    console.error("ERREUR KPIs (fallback appliqué) :", err.message);
    // Même en cas d'erreur, on renvoie les valeurs de secours (0 / [])
    const { FALLBACK_STATS } = require("../services/kpiService");
    return res.json(FALLBACK_STATS);
  }
});

// GET /api/admin/settings
router.get("/settings", async (req, res) => {
  try {
    const { data, error } = await supa.from("settings").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Erreur settings:", err);
    res.status(500).json({ error: "Erreur lors du chargement des paramètres" });
  }
});

// PATCH /api/admin/settings
router.patch("/settings", async (req, res) => {
  const { updates } = req.body; // [{ key, value }]
  if (!Array.isArray(updates) || updates.length === 0 || updates.length > 50) {
    return res.status(400).json({ error: "Format invalide (entre 1 et 50 paramètres)" });
  }

  // Liste blanche des clés de paramètres autorisés
  const ALLOWED_KEYS = ["commission_rate", "delivery_fee", "maintenance_mode", "support_phone", "support_email", "about_text"];

  for (const item of updates) {
    if (!item || typeof item !== "object") {
      return res.status(400).json({ error: "Format de paramètre invalide" });
    }
    const { key, value } = item;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: `Clé de paramètre non autorisée: ${key}` });
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      return res.status(400).json({ error: `Valeur invalide pour ${key}` });
    }
  }

  try {
    for (const { key, value } of updates) {
      // Validation spécifique par clé
      if (key === "commission_rate") {
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0 || num > 100) {
          return res.status(400).json({ error: "commission_rate doit être entre 0 et 100" });
        }
      }
      await supa.from("settings").upsert({ key, value: String(value).slice(0, 500), updated_at: new Date().toISOString() });
    }
    res.json({ message: "Paramètres mis à jour" });
  } catch (err) {
    console.error("Erreur mise à jour settings:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour des paramètres" });
  }
});

// GET /api/admin/comments?approved=false
router.get("/comments", async (req, res) => {
  const { approved } = req.query;
  try {
    let q = supa.from("comments").select("*, products(name, emoji)");
    if (approved !== undefined) {
      if (approved !== "true" && approved !== "false") {
        return res.status(400).json({ error: "Paramètre approved invalide" });
      }
      q = q.eq("approved", approved === "true");
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ comments: data });
  } catch (err) {
    console.error("Erreur liste commentaires:", err);
    res.status(500).json({ error: "Erreur lors du chargement des commentaires" });
  }
});

// PATCH /api/admin/comments/:id
router.patch("/comments/:id", async (req, res) => {
  const commentId = req.params.id;
  if (!UUID_REGEX.test(commentId || "")) {
    return res.status(400).json({ error: "ID de commentaire invalide" });
  }
  const { approved } = req.body;
  if (typeof approved !== "boolean") {
    return res.status(400).json({ error: "Le champ approved doit être un booléen" });
  }
  try {
    const { data, error } = await supa
      .from("comments").update({ approved }).eq("id", commentId).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Commentaire introuvable" });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error("Erreur mise à jour commentaire:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du commentaire" });
  }
});

// DELETE /api/admin/comments/:id
router.delete("/comments/:id", async (req, res) => {
  const commentId = req.params.id;
  if (!UUID_REGEX.test(commentId || "")) {
    return res.status(400).json({ error: "ID de commentaire invalide" });
  }
  try {
    const { data, error } = await supa.from("comments").delete().eq("id", commentId).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Commentaire introuvable" });
      }
      throw error;
    }
    res.json({ message: "Commentaire supprimé" });
  } catch (err) {
    console.error("Erreur suppression commentaire:", err);
    res.status(500).json({ error: "Erreur lors de la suppression du commentaire" });
  }
});

// PATCH /api/admin/products/:id/featured
router.patch("/products/:id/featured", async (req, res) => {
  const productId = req.params.id;
  if (!UUID_REGEX.test(productId || "")) {
    return res.status(400).json({ error: "ID de produit invalide" });
  }
  const { featured } = req.body;
  if (typeof featured !== "boolean") {
    return res.status(400).json({ error: "Le champ featured doit être un booléen" });
  }
  try {
    const { data, error } = await supa.from("products")
      .update({ featured }).eq("id", productId).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Produit introuvable" });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error("Erreur mise à jour featured:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du produit" });
  }
});

// GET /api/admin/users?type=vendor|client|livreur|admin|superadmin
// ═══════════════════════════════════════════════════════════
//  CORRIGÉ : lit directement les VRAIES tables Prisma correspondantes
//  (clients, vendors, livreurs, admins, superadmins) au lieu d'un
//  modèle centralisé "users"/"profiles" inexistant.
// ═══════════════════════════════════════════════════════════
router.get("/users", async (req, res) => {
  const { type, active } = req.query;
  const validTypes = ["client", "vendor", "livreur", "admin", "superadmin"];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: "Type d'utilisateur invalide" });
  }
  if (active !== undefined && active !== "true" && active !== "false") {
    return res.status(400).json({ error: "Paramètre active invalide" });
  }

  try {
    let data = [];

    // ─── CLIENTS ───
    if (!type || type === "client") {
      const clients = await prisma.client.findMany({
        orderBy: { createdAt: "desc" },
      });
      data = data.concat(
        clients.map(c => ({
          user_id: c.userId,
          name: c.name,
          phone: c.phone,
          address: c.address,
          active: c.active,
          created_at: c.createdAt,
        }))
      );
    }

    // ─── VENDEURS ───
    if (!type || type === "vendor") {
      const vendors = await prisma.vendor.findMany({
        orderBy: { createdAt: "desc" },
      });
      data = data.concat(
        vendors.map(v => ({
          user_id: v.userId,
          name: v.name,
          phone: v.phone,
          shop_name: v.shopName,
          whatsapp: v.whatsapp,
          address: v.address,
          active: v.active,
          created_at: v.createdAt,
        }))
      );
    }

    // ─── LIVREURS ───
    if (!type || type === "livreur") {
      // Tous les livreurs (tous statuts : pending, approved, active, deleted...)
      const livreurs = await prisma.livreur.findMany({
        orderBy: { createdAt: "desc" },
      });
      data = data.concat(
        livreurs.map(l => ({
          user_id: l.userId,
          name: l.name,
          phone: l.phone,
          status: l.status,
          active: l.active,
          vehicule: l.vehicule,
          zone_travail: l.zoneTravail,
          photo_url: l.photoUrl,
          permis: l.permis,
          permis_recto_url: l.permisRectoUrl,
          permis_verso_url: l.permisVersoUrl,
          cni_url: l.cniUrl,
          current_lat: l.currentLat,
          current_lng: l.currentLng,
          is_online: l.isOnline,
          admin_note: l.adminNote,
          created_at: l.createdAt,
        }))
      );
    }

    // ─── ADMINS ───
    if (!type || type === "admin") {
      const admins = await prisma.admins.findMany({
        orderBy: { created_at: "desc" },
      });
      data = data.concat(
        admins.map(a => ({
          user_id: a.user_id,
          name: a.name,
          phone: a.phone,
          active: a.active,
          created_at: a.created_at,
        }))
      );
    }

    // ─── SUPERADMINS ───
    if (!type || type === "superadmin") {
      const superadmins = await prisma.superadmins.findMany({
        orderBy: { created_at: "desc" },
      });
      data = data.concat(
        superadmins.map(s => ({
          user_id: s.user_id,
          name: s.name,
          phone: s.phone,
          active: s.active,
          created_at: s.created_at,
        }))
      );
    }

    if (active !== undefined) {
      data = data.filter((item) => item.active === (active === "true"));
    }

    res.json({ users: data });
  } catch (err) {
    console.error("Erreur liste utilisateurs:", err);
    res.status(500).json({ error: "Erreur lors du chargement des utilisateurs" });
  }
});

// PATCH /api/admin/users/:id — activer/désactiver
router.patch("/users/:id", async (req, res) => {
  const userId = req.params.id;
  if (!UUID_REGEX.test(userId || "")) {
    return res.status(400).json({ error: "ID utilisateur invalide" });
  }
  const { active } = req.body;
  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "Le champ active doit être un booléen" });
  }

  // Empêcher un admin de se désactiver soi-même
  if (userId === req.user.id) {
    return res.status(400).json({ error: "Vous ne pouvez pas modifier votre propre statut actif" });
  }

  // Empêcher un admin non-superadmin de modifier un superadmin
  if (req.profile.type !== "superadmin") {
    const isSuperAdmin = await prisma.superadmins.findUnique({
      where: { user_id: userId },
      select: { user_id: true },
    });
    if (isSuperAdmin) {
      return res.status(403).json({ error: "Seul le superadmin peut modifier un superadmin" });
    }
  }

  try {
    // ─── VRAIES TABLES PRISMA ───
    // Recherche dans l'ordre : clients, vendors, livreurs, admins, superadmins
    let result = null;

    const client = await prisma.client.updateMany({
      where: { userId },
      data: { active },
    }).catch(() => ({ count: 0 }));
    if (client.count > 0) {
      result = await prisma.client.findUnique({ where: { userId } });
    }

    if (!result) {
      const vendor = await prisma.vendor.updateMany({
        where: { userId },
        data: { active },
      }).catch(() => ({ count: 0 }));
      if (vendor.count > 0) {
        result = await prisma.vendor.findUnique({ where: { userId } });
      }
    }

    if (!result) {
      const livreur = await prisma.livreur.updateMany({
        where: { userId },
        data: { active },
      }).catch(() => ({ count: 0 }));
      if (livreur.count > 0) {
        result = await prisma.livreur.findUnique({ where: { userId } });
      }
    }

    if (!result) {
      const admin = await prisma.admins.updateMany({
        where: { user_id: userId },
        data: { active },
      }).catch(() => ({ count: 0 }));
      if (admin.count > 0) {
        result = await prisma.admins.findUnique({ where: { user_id: userId } });
      }
    }

    if (!result) {
      const superadmin = await prisma.superadmins.updateMany({
        where: { user_id: userId },
        data: { active },
      }).catch(() => ({ count: 0 }));
      if (superadmin.count > 0) {
        result = await prisma.superadmins.findUnique({ where: { user_id: userId } });
      }
    }

    if (!result) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json(result);
  } catch (err) {
    console.error("Erreur modification utilisateur:", err);
    res.status(500).json({ error: "Erreur lors de la modification de l'utilisateur" });
  }
});

// ─── CRUD ZONES DE LIVRAISON ───
router.get("/zones", async (req, res) => {
  try {
    const { data, error } = await supa.from("zones").select("*").order("name");
    if (error) throw error;
    res.json({ zones: data });
  } catch (err) {
    console.error("Erreur zones:", err);
    res.status(500).json({ error: "Erreur lors du chargement des zones" });
  }
});

router.post("/zones", async (req, res) => {
  const { name, max_km, price } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nom de zone requis (min 2 caractères)" });
  }
  const km = Number(max_km);
  const p = Number(price);
  if (!Number.isFinite(km) || km < 0) return res.status(400).json({ error: "max_km invalide" });
  if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: "price invalide" });
  try {
    const { data, error } = await supa.from("zones").insert({
      name: name.trim().slice(0, 100),
      max_km: km,
      price: p,
      active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("ERREUR CRUCIALE BASE DE DONNÉES :", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
});

router.patch("/zones/:id", async (req, res) => {
  const zoneId = Number(req.params.id);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ error: "ID de zone invalide" });
  }
  const updates = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length < 2) {
      return res.status(400).json({ error: "Nom de zone invalide" });
    }
    updates.name = req.body.name.trim().slice(0, 100);
  }
  if (req.body.max_km !== undefined) {
    const km = Number(req.body.max_km);
    if (!Number.isFinite(km) || km < 0) return res.status(400).json({ error: "max_km invalide" });
    updates.max_km = km;
  }
  if (req.body.price !== undefined) {
    const p = Number(req.body.price);
    if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: "price invalide" });
    updates.price = p;
  }
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== "boolean") return res.status(400).json({ error: "active doit être booléen" });
    updates.active = req.body.active;
  }
  try {
    const { data, error } = await supa.from("zones").update(updates).eq("id", zoneId).select().single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Zone introuvable" });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error("Erreur modification zone:", err);
    res.status(500).json({ error: "Erreur lors de la modification de la zone" });
  }
});

router.delete("/zones/:id", async (req, res) => {
  const zoneId = Number(req.params.id);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ error: "ID de zone invalide" });
  }
  try {
    const { data, error } = await supa.from("zones").delete().eq("id", zoneId).select().single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Zone introuvable" });
      throw error;
    }
    res.json({ message: "Zone supprimée" });
  } catch (err) {
    console.error("Erreur suppression zone:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de la zone" });
  }
});

// ─── CRUD CATÉGORIES DE PRODUITS ───
router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supa.from("settings").select("*").eq("key", "product_categories");
    if (error) throw error;
    let categories = [];
    if (data && data.length > 0 && data[0].value) {
      try { categories = JSON.parse(data[0].value); } catch (e) { categories = []; }
    }
    res.json({ categories });
  } catch (err) {
    console.error("Erreur catégories:", err);
    res.status(500).json({ error: "Erreur lors du chargement des catégories" });
  }
});

router.post("/categories", async (req, res) => {
  const { name, emoji } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nom de catégorie requis (min 2 caractères)" });
  }
  try {
    const { data, error } = await supa.from("settings").select("*").eq("key", "product_categories");
    if (error) throw error;
    let categories = [];
    if (data && data.length > 0 && data[0].value) {
      try { categories = JSON.parse(data[0].value); } catch (e) { categories = []; }
    }
    const newCat = {
      id: Date.now().toString(),
      name: name.trim().slice(0, 50),
      emoji: (emoji || "📦").toString().slice(0, 10),
    };
    categories.push(newCat);
    await supa.from("settings").upsert({ key: "product_categories", value: JSON.stringify(categories), updated_at: new Date().toISOString() });
    res.status(201).json(newCat);
  } catch (err) {
    console.error("Erreur création catégorie:", err);
    res.status(500).json({ error: "Erreur lors de la création de la catégorie" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  const catId = req.params.id;
  try {
    const { data, error } = await supa.from("settings").select("*").eq("key", "product_categories");
    if (error) throw error;
    let categories = [];
    if (data && data.length > 0 && data[0].value) {
      try { categories = JSON.parse(data[0].value); } catch (e) { categories = []; }
    }
    categories = categories.filter(c => c.id !== catId);
    await supa.from("settings").upsert({ key: "product_categories", value: JSON.stringify(categories), updated_at: new Date().toISOString() });
    res.json({ message: "Catégorie supprimée" });
  } catch (err) {
    console.error("Erreur suppression catégorie:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de la catégorie" });
  }
});

// ─── CRUD ADMINS ───
// CORRIGÉ : lit la vraie table "admins" via Prisma
router.get("/admins", async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({
      orderBy: { created_at: "desc" },
    });
    res.json({ admins });
  } catch (err) {
    console.error("Erreur admins:", err);
    res.status(500).json({ error: "Erreur lors du chargement des admins" });
  }
});

router.post("/admins", async (req, res) => {
  const { user_id, name, phone, password } = req.body;
  if (!user_id || !UUID_REGEX.test(user_id)) {
    return res.status(400).json({ error: "user_id valide requis" });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nom requis (min 2 caractères)" });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Mot de passe requis (min 8 caractères)" });
  }
  try {
    // Vérifier que l'utilisateur existe dans auth.users
    const { data: existingUser, error: userError } = await supa.auth.admin.getUserById(user_id);
    if (userError || !existingUser?.user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Mettre à jour le mot de passe de l'utilisateur
    const { error: pwdError } = await supa.auth.admin.updateUserById(user_id, { password });
    if (pwdError) throw pwdError;

    // Créer le profil admin
    const { data, error } = await supa.from("admins").insert({
      user_id,
      name: name.trim().slice(0, 100),
      phone: phone ? String(phone).slice(0, 30) : null,
      active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("Erreur création admin:", err);
    res.status(500).json({ error: "Erreur lors de la création de l'admin" });
  }
});

router.patch("/admins/:id", async (req, res) => {
  const adminId = req.params.id;
  if (!UUID_REGEX.test(adminId || "")) {
    return res.status(400).json({ error: "ID admin invalide" });
  }
  const updates = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length < 2) {
      return res.status(400).json({ error: "Nom invalide" });
    }
    updates.name = req.body.name.trim().slice(0, 100);
  }
  if (req.body.phone !== undefined) updates.phone = String(req.body.phone).slice(0, 30);
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== "boolean") return res.status(400).json({ error: "active doit être booléen" });
    updates.active = req.body.active;
  }
  try {
    const { data, error } = await supa.from("admins").update(updates).eq("user_id", adminId).select().single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Admin introuvable" });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error("Erreur modification admin:", err);
    res.status(500).json({ error: "Erreur lors de la modification de l'admin" });
  }
});

router.delete("/admins/:id", async (req, res) => {
  const adminId = req.params.id;
  if (!UUID_REGEX.test(adminId || "")) {
    return res.status(400).json({ error: "ID admin invalide" });
  }
  try {
    const { data, error } = await supa.from("admins").delete().eq("user_id", adminId).select().single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Admin introuvable" });
      throw error;
    }
    res.json({ message: "Admin supprimé" });
  } catch (err) {
    console.error("Erreur suppression admin:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'admin" });
  }
});

// ─── GESTION DES THÈMES ───
router.get("/themes", async (req, res) => {
  try {
    const { data, error } = await supa.from("settings").select("*").eq("key", "theme");
    if (error) throw error;
    let theme = "dark";
    if (data && data.length > 0 && data[0].value) theme = data[0].value;
    res.json({ theme });
  } catch (err) {
    console.error("Erreur thème:", err);
    res.status(500).json({ error: "Erreur lors du chargement du thème" });
  }
});

router.patch("/themes", async (req, res) => {
  const { theme } = req.body;
  const VALID_THEMES = ["dark", "light", "blue", "emerald", "purple"];
  if (!theme || !VALID_THEMES.includes(theme)) {
    return res.status(400).json({ error: "Thème invalide. Choisir parmi: " + VALID_THEMES.join(", ") });
  }
  try {
    await supa.from("settings").upsert({ key: "theme", value: theme, updated_at: new Date().toISOString() });
    res.json({ theme });
  } catch (err) {
    console.error("Erreur mise à jour thème:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du thème" });
  }
});

// Map lieux CRUD
router.get("/map-lieux", async (req, res) => {
  try {
    const { data, error } = await supa.from("map_lieux").select("*").order("name");
    if (error) throw error;
    res.json({ lieux: data });
  } catch (err) {
    console.error("Erreur map lieux:", err);
    res.status(500).json({ error: "Erreur lors du chargement des lieux" });
  }
});

function validateMapLieu(body) {
  const errors = [];
  const data = {};

  if (body.name !== undefined) {
    data.name = sanitizeString(body.name, 100);
    if (!data.name || data.name.length < 2) errors.push("Nom du lieu requis (2-100 caractères)");
  }

  if (body.lat !== undefined) {
    const lat = Number(body.lat);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) errors.push("Latitude invalide");
    else data.lat = lat;
  }

  if (body.lng !== undefined) {
    const lng = Number(body.lng);
    if (!Number.isFinite(lng) || Math.abs(lng) > 180) errors.push("Longitude invalide");
    else data.lng = lng;
  }

  if (body.type !== undefined) {
    data.type = sanitizeString(body.type, 50);
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") errors.push("Le champ active doit être un booléen");
    else data.active = body.active;
  }

  return { data, errors };
}

router.post("/map-lieux", async (req, res) => {
  const { data: lieuData, errors } = validateMapLieu(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join("; ") });
  }
  if (!lieuData.name) {
    return res.status(400).json({ error: "Nom du lieu requis" });
  }

  try {
    const { data, error } = await supa.from("map_lieux").insert(lieuData).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("Erreur création lieu:", err);
    res.status(500).json({ error: "Erreur lors de la création du lieu" });
  }
});

router.patch("/map-lieux/:id", async (req, res) => {
  const lieuId = req.params.id;
  if (!UUID_REGEX.test(lieuId || "")) {
    return res.status(400).json({ error: "ID de lieu invalide" });
  }
  const { data: lieuData, errors } = validateMapLieu(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join("; ") });
  }

  try {
    const { data, error } = await supa.from("map_lieux")
      .update(lieuData).eq("id", lieuId).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Lieu introuvable" });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error("Erreur modification lieu:", err);
    res.status(500).json({ error: "Erreur lors de la modification du lieu" });
  }
});

router.delete("/map-lieux/:id", async (req, res) => {
  const lieuId = req.params.id;
  if (!UUID_REGEX.test(lieuId || "")) {
    return res.status(400).json({ error: "ID de lieu invalide" });
  }
  try {
    const { data, error } = await supa.from("map_lieux").delete().eq("id", lieuId).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Lieu introuvable" });
      }
      throw error;
    }
    res.json({ message: "Lieu supprimé" });
  } catch (err) {
    console.error("Erreur suppression lieu:", err);
    res.status(500).json({ error: "Erreur lors de la suppression du lieu" });
  }
});

// GET /api/admin/drivers — Liste complète des livreurs avec positions GPS pour la carte en direct
router.get("/drivers", async (req, res) => {
  try {
    // Récupère TOUS les livreurs sans exclure les statuts (pending, approved, active, deleted, rejected...)
    const { data, error } = await supa
      .from("livreurs")
      .select("user_id, name, phone, status, active, is_online, vehicule, photo_url, current_lat, current_lng, zone_travail, created_at");
    if (error) throw error;
    res.json({ drivers: data || [] });
  } catch (err) {
    console.error("Erreur drivers:", err);
    res.status(500).json({ error: "Erreur lors du chargement des livreurs" });
  }
});

// GET /api/admin/notifications — Notifications réelles de l'admin connecté
router.get("/notifications", async (req, res) => {
  try {
    const { data, error } = await supa
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const unreadCount = (data || []).filter(n => !n.read).length;
    res.json({ notifications: data || [], unreadCount });
  } catch (err) {
    console.error("Erreur notifications:", err);
    res.status(500).json({ error: "Erreur lors du chargement des notifications" });
  }
});

// GET /api/admin/finances/monthly — Évolution mensuelle des commissions (12 derniers mois)
router.get("/finances/monthly", async (req, res) => {
  try {
    const { data, error } = await supa
      .from("orders")
      .select("commission, created_at")
      .eq("status", "delivered");
    if (error) throw error;

    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString("fr-FR", { month: "short" }) + " " + String(d.getFullYear()).slice(2),
        value: 0,
      });
    }
    const map = {};
    months.forEach(m => { map[m.key] = m; });

    for (const order of data || []) {
      if (!order.created_at) continue;
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (map[key]) map[key].value += order.commission || 0;
    }

    res.json({ monthly: months });
  } catch (err) {
    console.error("Erreur finances monthly:", err);
    res.status(500).json({ error: "Erreur lors du chargement des données financières" });
  }
});

// GET /api/admin/vendor-categories — Répartition des produits par catégorie
router.get("/vendor-categories", async (req, res) => {
  try {
    const { data, error } = await supa
      .from("products")
      .select("category")
      .eq("active", true);
    if (error) throw error;

    const countByCat = {};
    for (const p of data || []) {
      const cat = p.category || "Autres";
      countByCat[cat] = (countByCat[cat] || 0) + 1;
    }
    // Trier par nombre de produits décroissant
    const categories = Object.entries(countByCat)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    res.json({ categories });
  } catch (err) {
    console.error("Erreur vendor-categories:", err);
    res.status(500).json({ error: "Erreur lors du chargement des catégories de produits" });
  }
});

module.exports = router;
