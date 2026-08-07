const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

// Toutes les routes admin nécessitent le rôle admin ou superadmin
router.use(requireAuth, requireRole("admin", "superadmin"));

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    // Comptage via les métadonnées de Supabase (head:true → aucun tuple renvoyé, seul le count est calculé)
    const countAll = async (table) => {
      const { count, error } = await supa.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    };
    const countWhere = async (table, column, value) => {
      const { count, error } = await supa
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, value);
      if (error) throw error;
      return count || 0;
    };

    const [
      total_clients,
      total_vendors,
      total_livreurs,
      pending_livreurs,
      total_orders,
      active_deliveries,
      pending_comments,
      total_products,
    ] = await Promise.all([
      countAll("clients"),
      countAll("vendors"),
      countWhere("livreurs", "status", "approved"),
      countWhere("livreurs", "status", "pending"),
      countAll("orders"),
      countWhere("orders", "status", "delivering"),
      countWhere("comments", "approved", false),
      countWhere("products", "active", true),
    ]);

    // Commission totale des commandes livrées (somme côté serveur)
    let total_commission = 0;
    const { data: deliveredOrders, error: commissionError } = await supa
      .from("orders")
      .select("commission")
      .eq("status", "delivered");
    if (commissionError) throw commissionError;
    for (const order of deliveredOrders || []) {
      total_commission += order.commission || 0;
    }

    res.json({
      total_clients,
      total_vendors,
      total_livreurs,
      pending_livreurs,
      total_orders,
      active_deliveries,
      total_commission,
      pending_comments,
      total_products,
    });
  } catch (err) {
    console.error("Erreur stats admin:", err);
    res.status(500).json({ error: "Erreur lors du chargement des statistiques" });
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

// GET /api/admin/users
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
    if (!type || type === "client") {
      const { data: clients, error } = await supa.from("clients").select("user_id, name, phone, address, active, created_at");
      if (error) throw error;
      data = data.concat(clients || []);
    }
    if (!type || type === "vendor") {
      const { data: vendors, error } = await supa.from("vendors").select("user_id, name, phone, shop_name, whatsapp, address, active, created_at");
      if (error) throw error;
      data = data.concat(vendors || []);
    }
    if (!type || type === "livreur") {
      const { data: livreurs, error } = await supa.from("livreurs").select("user_id, name, phone, status, active, created_at");
      if (error) throw error;
      data = data.concat(livreurs || []);
    }
    if (!type || type === "admin") {
      const { data: admins, error } = await supa.from("admins").select("user_id, name, phone, active, created_at");
      if (error) throw error;
      data = data.concat(admins || []);
    }
    if (!type || type === "superadmin") {
      const { data: superadmins, error } = await supa.from("superadmins").select("user_id, name, phone, active, created_at");
      if (error) throw error;
      data = data.concat(superadmins || []);
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
    const { data: isSuperAdmin } = await supa.from("superadmins").select("user_id").eq("user_id", userId).maybeSingle();
    if (isSuperAdmin) {
      return res.status(403).json({ error: "Seul le superadmin peut modifier un superadmin" });
    }
  }

  try {
    const updatePayload = { active };
    const targets = ["clients", "vendors", "livreurs", "admins", "superadmins"];
    let result = null;

    for (const table of targets) {
      const { data, error } = await supa.from(table).update(updatePayload).eq("user_id", userId).select().single();
      if (!error && data) {
        result = data;
        break;
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
    console.error("Erreur création zone:", err);
    res.status(500).json({ error: "Erreur lors de la création de la zone" });
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
router.get("/admins", async (req, res) => {
  try {
    const { data, error } = await supa.from("admins").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ admins: data });
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

module.exports = router;