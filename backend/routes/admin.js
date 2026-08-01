const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

// Toutes les routes admin nécessitent le rôle admin
router.use(requireAuth, requireRole("admin"));

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const { data } = await supa.from("admin_stats").select("*").single();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings
router.get("/settings", async (req, res) => {
  const { data } = await supa.from("settings").select("*");
  res.json(data);
});

// PATCH /api/admin/settings
router.patch("/settings", async (req, res) => {
  const { updates } = req.body; // [{ key, value }]
  if (!Array.isArray(updates)) return res.status(400).json({ error: "Format invalide" });
  try {
    for (const { key, value } of updates) {
      await supa.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    }
    res.json({ message: "Paramètres mis à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/comments?approved=false
router.get("/comments", async (req, res) => {
  const { approved } = req.query;
  try {
    let q = supa.from("comments").select("*, products(name, emoji)");
    if (approved !== undefined) q = q.eq("approved", approved === "true");
    const { data } = await q.order("created_at", { ascending: false });
    res.json({ comments: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/comments/:id
router.patch("/comments/:id", async (req, res) => {
  const { approved } = req.body;
  try {
    const { data, error } = await supa
      .from("comments").update({ approved }).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/comments/:id
router.delete("/comments/:id", async (req, res) => {
  await supa.from("comments").delete().eq("id", req.params.id);
  res.json({ message: "Commentaire supprimé" });
});

// PATCH /api/admin/products/:id/featured
router.patch("/products/:id/featured", async (req, res) => {
  const { featured } = req.body;
  const { data, error } = await supa.from("products")
    .update({ featured }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const { type, active } = req.query;
  let q = supa.from("profiles").select("*");
  if (type)   q = q.eq("type", type);
  if (active) q = q.eq("active", active === "true");
  const { data } = await q.order("created_at", { ascending: false });
  res.json({ users: data });
});

// PATCH /api/admin/users/:id — activer/désactiver
router.patch("/users/:id", async (req, res) => {
  const { active } = req.body;
  const { data, error } = await supa
    .from("profiles").update({ active }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Map lieux CRUD
router.get("/map-lieux", async (req, res) => {
  const { data } = await supa.from("map_lieux").select("*").order("name");
  res.json({ lieux: data });
});

router.post("/map-lieux", async (req, res) => {
  const { data, error } = await supa.from("map_lieux").insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch("/map-lieux/:id", async (req, res) => {
  const { data, error } = await supa.from("map_lieux")
    .update(req.body).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete("/map-lieux/:id", async (req, res) => {
  await supa.from("map_lieux").delete().eq("id", req.params.id);
  res.json({ message: "Lieu supprimé" });
});

module.exports = router;