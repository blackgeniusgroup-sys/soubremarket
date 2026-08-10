const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const prisma  = require("../services/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const VALID_CATEGORIES = ["alimentation", "vetements", "electronique", "maison", "beaute", "autres"];
const MAX_NAME_LENGTH = 100;
const MAX_DESC_LENGTH = 2000;
const MAX_PRICE = 100_000_000;
const MAX_STOCK = 1_000_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

function validateProductData(body, { requireAll = true } = {}) {
  const errors = [];
  const data = {};

  if (body.name !== undefined || requireAll) {
    data.name = sanitizeString(body.name, MAX_NAME_LENGTH);
    if (!data.name || data.name.length < 2) {
      errors.push("Le nom du produit doit contenir au moins 2 caractères");
    }
  }

  if (body.description !== undefined) {
    data.description = sanitizeString(body.description, MAX_DESC_LENGTH);
  }

  if (body.price !== undefined || requireAll) {
    data.price = Number(body.price);
    if (!Number.isFinite(data.price) || data.price < 0 || data.price > MAX_PRICE) {
      errors.push(`Le prix doit être un nombre entre 0 et ${MAX_PRICE}`);
    }
  }

  if (body.stock !== undefined || requireAll) {
    data.stock = Number(body.stock);
    if (!Number.isInteger(data.stock) || data.stock < 0 || data.stock > MAX_STOCK) {
      errors.push(`Le stock doit être un entier entre 0 et ${MAX_STOCK}`);
    }
  }

  if (body.category !== undefined || requireAll) {
    data.category = sanitizeString(body.category, 50);
    if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
      errors.push("Catégorie invalide");
    }
  }

  return { data, errors };
}

// GET /api/products — catalogue public (avec limite de pagination stricte)
router.get("/", async (req, res) => {
  const { cat, search, min, max, sort, featured, limit = 50, offset = 0 } = req.query;

  // Validation stricte de la pagination
  const pageLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  const pageOffset = Math.max(parseInt(offset) || 0, 0);

  try {
    let q = supa
      .from("products")
      .select(`*, vendors(shop_name, whatsapp, address)`, { count: "exact" })
      .eq("active", true)
      .range(pageOffset, pageOffset + pageLimit - 1);

    if (cat) {
      const cleanCat = sanitizeString(cat, 50);
      if (cleanCat) q = q.eq("category", cleanCat);
    }
    if (featured === "true") q = q.eq("featured", true);
    if (min !== undefined && min !== "") {
      const minVal = Number(min);
      if (Number.isFinite(minVal) && minVal >= 0) q = q.gte("price", minVal);
    }
    if (max !== undefined && max !== "") {
      const maxVal = Number(max);
      if (Number.isFinite(maxVal) && maxVal >= 0) q = q.lte("price", maxVal);
    }
    if (search) {
      const cleanSearch = sanitizeString(search, 100);
      if (cleanSearch) q = q.ilike("name", `%${cleanSearch}%`);
    }

    switch (sort) {
      case "price_asc":  q = q.order("price", { ascending: true });  break;
      case "price_desc": q = q.order("price", { ascending: false }); break;
      case "rating":     q = q.order("rating", { ascending: false }); break;
      case "popular":    q = q.order("total_sales", { ascending: false }); break;
      default:           q = q.order("created_at", { ascending: false });
    }

    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ products: data, total: count });
  } catch (err) {
    console.error("Erreur catalogue:", err);
    res.status(500).json({ error: "Erreur lors du chargement du catalogue" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  const productId = req.params.id;
  // Valider que l'ID est un UUID
  if (!UUID_REGEX.test(productId || "")) {
    return res.status(400).json({ error: "ID de produit invalide" });
  }

  try {
    const { data, error } = await supa
      .from("products")
      .select(`*, vendors(shop_name, whatsapp, address),
               comments(id, user_name, rating, text, created_at)`)
      .eq("id", productId)
      .eq("active", true)
      .eq("comments.approved", true) // Ne montrer que les commentaires approuvés
      .single();
    if (error) return res.status(404).json({ error: "Produit introuvable" });
    res.json(data);
  } catch (err) {
    console.error("Erreur produit:", err);
    res.status(500).json({ error: "Erreur lors du chargement du produit" });
  }
});

// POST /api/products — créer un produit (vendeur ou admin)
router.post("/", requireAuth, requireRole("vendor","admin"), async (req, res) => {
  const { vendor_id: bodyVendorId } = req.body;

  const { data: productInput, errors } = validateProductData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join("; ") });
  }

  try {
    let vendor;

    if (req.profile.type === "vendor") {
      vendor = await prisma.vendor.findUnique({
        where: { userId: req.user.id },
        select: { userId: true }
      });
      if (!vendor) return res.status(403).json({ error: "Profil vendeur introuvable" });
    } else {
      if (!bodyVendorId || !UUID_REGEX.test(bodyVendorId)) {
        return res.status(400).json({ error: "vendor_id valide requis pour un administrateur" });
      }
      vendor = await prisma.vendor.findUnique({
        where: { userId: bodyVendorId },
        select: { userId: true }
      });
      if (!vendor) return res.status(400).json({ error: "Vendor introuvable" });
    }

    const { data, error } = await supa.from("products").insert({
      vendor_id: vendor.userId,
      name: productInput.name,
      description: productInput.description,
      price: productInput.price,
      stock: productInput.stock,
      category: productInput.category,
      emoji: sanitizeString(req.body.emoji, 10) || "📦",
      featured: false
    }).select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("Erreur création produit:", err);
    res.status(500).json({ error: "Erreur lors de la création du produit" });
  }
});

// PATCH /api/products/:id
router.patch("/:id", requireAuth, requireRole("vendor","admin"), async (req, res) => {
  const productId = req.params.id;
  if (!UUID_REGEX.test(productId || "")) {
    return res.status(400).json({ error: "ID de produit invalide" });
  }

  const { data: productInput, errors } = validateProductData(req.body, { requireAll: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join("; ") });
  }

  try {
    // Charger le produit AVANT modification pour vérifier la propriété
    const { data: existing, error: fetchError } = await supa
      .from("products")
      .select("id, vendor_id, active")
      .eq("id", productId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    // IDOR - Un vendeur ne peut modifier QUE ses propres produits
    if (req.profile.type === "vendor" && existing.vendor_id !== req.user.id) {
      return res.status(403).json({ error: "Vous ne pouvez pas modifier ce produit" });
    }

    // Seul un admin peut changer le featured
    if (req.profile.type === "vendor") {
      delete productInput.featured;
    }

    // Seul un admin peut changer le statut actif
    if (req.profile.type !== "admin") {
      delete productInput.active;
    }

    if (req.body.emoji !== undefined) {
      productInput.emoji = sanitizeString(req.body.emoji, 10) || "📦";
    }

    const { data, error } = await supa
      .from("products").update(productInput).eq("id", productId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Erreur modification produit:", err);
    res.status(500).json({ error: "Erreur lors de la modification du produit" });
  }
});

// POST /api/products/:id/comments
router.post("/:id/comments", requireAuth, requireRole("client"), async (req, res) => {
  const productId = req.params.id;
  if (!UUID_REGEX.test(productId || "")) {
    return res.status(400).json({ error: "ID de produit invalide" });
  }

  const { rating, text } = req.body;

  // Validation du rating (1-5)
  const cleanRating = Number(rating);
  if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    return res.status(400).json({ error: "La note doit être un entier entre 1 et 5" });
  }

  // Validation du texte
  const cleanText = sanitizeString(text, 1000);
  if (!cleanText || cleanText.length < 3) {
    return res.status(400).json({ error: "Le commentaire doit contenir au moins 3 caractères" });
  }

  try {
    // Vérifier que le produit existe et est actif
    const { data: product, error: productError } = await supa
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("active", true)
      .single();
    if (productError) return res.status(404).json({ error: "Produit introuvable" });

    const { data, error } = await supa.from("comments").insert({
      product_id: productId,
      user_id:    req.user.id,
      user_name:  sanitizeString(req.profile.name, 100),
      rating:     cleanRating,
      text:       cleanText,
      approved:   false
    }).select().single();
    if (error) throw error;
    res.status(201).json({ message: "Avis soumis, en attente de validation", data });
  } catch (err) {
    console.error("Erreur commentaire:", err);
    res.status(500).json({ error: "Erreur lors de l'envoi du commentaire" });
  }
});

module.exports = router;