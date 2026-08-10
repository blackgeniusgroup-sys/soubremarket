const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const prisma  = require("../services/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Toutes les routes nécessitent le rôle vendeur
router.use(requireAuth, requireRole("vendor"));

// ─── GET /api/vendor/products — produits du vendeur connecté ───
router.get("/products", async (req, res) => {
  try {
    const { data, error } = await supa
      .from("products")
      .select("*")
      .eq("vendor_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ products: data || [] });
  } catch (err) {
    console.error("Erreur produits vendeur:", err);
    res.status(500).json({ error: "Erreur lors du chargement des produits" });
  }
});

// ─── GET /api/vendor/clients — clients ayant commandé chez ce vendeur ───
router.get("/clients", async (req, res) => {
  try {
    // Récupérer les commandes du vendeur avec les infos clients
    const { data: orders, error } = await supa
      .from("orders")
      .select("client_id, created_at")
      .eq("vendor_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Extraire les client_id uniques
    const clientIds = [...new Set((orders || []).map(o => o.client_id))];

    if (clientIds.length === 0) {
      return res.json({ clients: [] });
    }

    // Récupérer les profils clients
    const { data: clients, error: clientsError } = await supa
      .from("clients")
      .select("user_id, name, phone, address, active, created_at")
      .in("user_id", clientIds);
    if (clientsError) throw clientsError;

    // Compter les commandes par client
    const orderCounts = {};
    const totalSpent = {};
    for (const o of orders || []) {
      orderCounts[o.client_id] = (orderCounts[o.client_id] || 0) + 1;
    }

    // Récupérer les totaux par client
    const { data: orderTotals, error: totalsError } = await supa
      .from("orders")
      .select("client_id, total")
      .eq("vendor_id", req.user.id);
    if (totalsError) throw totalsError;
    for (const o of orderTotals || []) {
      totalSpent[o.client_id] = (totalSpent[o.client_id] || 0) + (o.total || 0);
    }

    const enriched = (clients || []).map(c => ({
      ...c,
      order_count: orderCounts[c.user_id] || 0,
      total_spent: totalSpent[c.user_id] || 0,
    }));

    res.json({ clients: enriched });
  } catch (err) {
    console.error("Erreur clients vendeur:", err);
    res.status(500).json({ error: "Erreur lors du chargement des clients" });
  }
});

// ─── POST /api/vendor/notify — envoyer une notification aux clients ───
router.post("/notify", async (req, res) => {
  const { client_ids, title, message, type = "promo" } = req.body;

  if (!Array.isArray(client_ids) || client_ids.length === 0 || client_ids.length > 200) {
    return res.status(400).json({ error: "Sélectionnez entre 1 et 200 clients" });
  }
  for (const id of client_ids) {
    if (!UUID_REGEX.test(id || "")) {
      return res.status(400).json({ error: "ID client invalide" });
    }
  }
  if (!title || typeof title !== "string" || title.trim().length < 2 || title.length > 100) {
    return res.status(400).json({ error: "Titre requis (2-100 caractères)" });
  }
  if (!message || typeof message !== "string" || message.trim().length < 2 || message.length > 500) {
    return res.status(400).json({ error: "Message requis (2-500 caractères)" });
  }
  const validTypes = ["promo", "new_arrival", "info"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: "Type de notification invalide" });
  }

  try {
    const cleanTitle = title.trim().slice(0, 100);
    const cleanMessage = message.trim().slice(0, 500);

    // Créer les notifications pour chaque client
    const notifications = client_ids.map(clientId => ({
      user_id: clientId,
      title: cleanTitle,
      message: cleanMessage,
      type,
      data: { vendor_id: req.user.id },
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supa.from("notifications").insert(notifications).select();
    if (error) throw error;

    res.status(201).json({
      message: `Notification envoyée à ${client_ids.length} client(s)`,
      count: client_ids.length,
      notifications: data,
    });
  } catch (err) {
    console.error("Erreur envoi notification:", err);
    res.status(500).json({ error: "Erreur lors de l'envoi de la notification" });
  }
});

// ─── POST /api/vendor/upload — uploader une image (produit, logo, bannière) ───
router.post("/upload", async (req, res) => {
  const { file_base64, file_name, folder = "products" } = req.body;

  if (!file_base64 || typeof file_base64 !== "string") {
    return res.status(400).json({ error: "Données d'image manquantes" });
  }
  if (!file_name || typeof file_name !== "string") {
    return res.status(400).json({ error: "Nom de fichier manquant" });
  }

  // Valider la taille (max 5 Mo)
  const base64Size = Buffer.byteLength(file_base64, "base64");
  if (base64Size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "Image trop volumineuse (max 5 Mo)" });
  }

  const validFolders = ["products", "logos", "banners"];
  if (!validFolders.includes(folder)) {
    return res.status(400).json({ error: "Dossier invalide" });
  }

  try {
    // Nettoyer le nom de fichier
    const cleanName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const ext = cleanName.split(".").pop() || "png";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `${folder}/${req.user.id}/${timestamp}-${random}.${ext}`;

    // Décoder le base64
    const buffer = Buffer.from(file_base64, "base64");

    // Upload vers Supabase Storage
    const { data, error } = await supa.storage
      .from("soubremarket")
      .upload(path, buffer, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        upsert: false,
      });

    if (error) throw error;

    // Générer l'URL publique
    const { data: publicData } = supa.storage
      .from("soubremarket")
      .getPublicUrl(path);

    res.status(201).json({
      message: "Image uploadée avec succès",
      url: publicData.publicUrl,
      path,
    });
  } catch (err) {
    console.error("Erreur upload:", err);
    res.status(500).json({ error: "Erreur lors de l'upload de l'image" });
  }
});

module.exports = router;