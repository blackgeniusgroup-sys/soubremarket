const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

// GET /api/livreurs — liste des livreurs approuvés (admin)
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  try {
    let q = supa.from("livreurs").select("*, profiles(name, email, phone, avatar_url)");
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ livreurs: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/livreurs/me — profil du livreur connecté
router.get("/me", requireAuth, requireRole("livreur"), async (req, res) => {
  try {
    const { data, error } = await supa
      .from("livreurs").select("*").eq("user_id", req.user.id).single();
    if (error) return res.status(404).json({ error: "Profil livreur introuvable" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/livreurs/register — inscription livreur
router.post("/register", requireAuth, requireRole("livreur"), async (req, res) => {
  const { vehicule, zone_travail, photo_url } = req.body;
  if (!vehicule || !zone_travail) {
    return res.status(400).json({ error: "Véhicule et zone requis" });
  }
  try {
    const { data, error } = await supa.from("livreurs").insert({
      user_id: req.user.id, vehicule, zone_travail,
      photo_url, status: "pending"
    }).select().single();
    if (error) throw error;

    // Notifier les admins
    const { data: admins } = await supa.from("profiles").select("id").eq("type","admin");
    if (admins?.length > 0) {
      await supa.from("notifications").insert(
        admins.map(a => ({
          user_id: a.id, type: "livreur",
          title:   "Demande d'inscription livreur",
          message: `${req.profile.name} a soumis une demande pour devenir livreur.`,
          data:    { livreur_id: data.id }
        }))
      );
    }
    res.status(201).json({ message: "Demande soumise avec succès", livreur: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/livreurs/:id/status — admin approuve/refuse
router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const { status, admin_note } = req.body;
  if (!["approved","rejected","suspended"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    const { data, error } = await supa.from("livreurs")
      .update({ status, admin_note, ...(status === "approved" ? {} : {}) })
      .eq("id", req.params.id).select("*, profiles(name, email)").single();
    if (error) throw error;

    // Notifier le livreur
    const msgs = {
      approved:  "Félicitations ! Votre inscription en tant que livreur a été approuvée. Vous pouvez commencer à accepter des missions.",
      rejected:  "Votre demande d'inscription livreur a été refusée. " + (admin_note || ""),
      suspended: "Votre compte livreur a été temporairement suspendu. Contactez le support."
    };
    await supa.from("notifications").insert({
      user_id: data.profiles.user_id || req.user.id,
      title:   status === "approved" ? "Inscription approuvée ✅" : status === "rejected" ? "Demande refusée" : "Compte suspendu",
      message: msgs[status],
      type:    status === "approved" ? "success" : "system",
      data:    { livreur_id: data.id }
    });

    res.json({ message: "Statut mis à jour", livreur: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/livreurs/location — livreur met à jour sa position GPS
router.patch("/location", requireAuth, requireRole("livreur"), async (req, res) => {
  const { lat, lng, is_online } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées GPS requises" });
  }
  try {
    const { error } = await supa.from("livreurs")
      .update({ current_lat: +lat, current_lng: +lng, is_online: is_online ?? true })
      .eq("user_id", req.user.id);
    if (error) throw error;
    // Supabase Realtime diffuse automatiquement la mise à jour aux clients abonnés
    res.json({ message: "Position mise à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
