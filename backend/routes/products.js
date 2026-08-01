const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

// GET /api/products — catalogue public
router.get("/", async (req, res) => {
  const { cat, search, min, max, sort, featured, limit = 50, offset = 0 } = req.query;
  try {
    let q = supa
      .from("products")
      .select(`*, vendors(shop_name, whatsapp, address)`)
      .eq("active", true)
      .range(+offset, +offset + +limit - 1);

    if (cat)      q = q.eq("category", cat);
    if (featured) q = q.eq("featured", true);
    if (min)      q = q.gte("price", +min);
    if (max)      q = q.lte("price", +max);
    if (search)   q = q.ilike("name", `%${search}%`);

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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supa
      .from("products")
      .select(`*, vendors(shop_name, whatsapp, address, logo_url),
               comments(id, user_name, rating, text, created_at)`)
      .eq("id", req.params.id)
      .eq("active", true)
      .single();
    if (error) return res.status(404).json({ error: "Produit introuvable" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — créer un produit (vendeur uniquement)
router.post("/", requireAuth, requireRole("vendor","admin"), async (req, res) => {
  const { name, description, price, stock, category, emoji, featured } = req.body;
  if (!name || !price || !stock || !category) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }
  try {
    // Récupérer l'id du vendor
    const { data: vendor } = await supa
      .from("vendors").select("id").eq("user_id", req.user.id).single();
    if (!vendor) return res.status(403).json({ error: "Profil vendeur introuvable" });

    const { data, error } = await supa.from("products").insert({
      vendor_id: vendor.id, name, description, price: +price,
      stock: +stock, category, emoji: emoji || "📦", featured: !!featured
    }).select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id
router.patch("/:id", requireAuth, requireRole("vendor","admin"), async (req, res) => {
  try {
    const updates = {};
    ["name","description","price","stock","category","emoji","featured","active"]
      .forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supa
      .from("products").update(updates).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/comments
router.post("/:id/comments", requireAuth, requireRole("client"), async (req, res) => {
  const { rating, text } = req.body;
  if (!rating || !text) return res.status(400).json({ error: "Note et texte requis" });
  try {
    const { data, error } = await supa.from("comments").insert({
      product_id: req.params.id,
      user_id:    req.user.id,
      user_name:  req.profile.name,
      rating:     +rating,
      text,
      approved:   false
    }).select().single();
    if (error) throw error;
    res.status(201).json({ message: "Avis soumis, en attente de validation", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;