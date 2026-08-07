const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

const VALID_STATUSES = ["pending", "approved", "rejected", "suspended"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

// GET /api/livreurs — liste des livreurs (admin)
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    let q = supa.from("livreurs").select("*");
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ livreurs: data });
  } catch (err) {
    console.error("Erreur liste livreurs:", err);
    res.status(500).json({ error: "Erreur lors du chargement des livreurs" });
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
    console.error("Erreur profil livreur:", err);
    res.status(500).json({ error: "Erreur lors du chargement du profil" });
  }
});

// POST /api/livreurs/register — inscription livreur
router.post("/register", requireAuth, requireRole("livreur"), async (req, res) => {
  const { vehicule, zone_travail, photo_url } = req.body;

  const cleanVehicule = sanitizeString(vehicule, 100);
  if (!cleanVehicule || cleanVehicule.length < 2) {
    return res.status(400).json({ error: "Véhicule requis (2-100 caractères)" });
  }

  const cleanZone = sanitizeString(zone_travail, 100);
  if (!cleanZone || cleanZone.length < 2) {
    return res.status(400).json({ error: "Zone de travail requise (2-100 caractères)" });
  }

  const cleanPhotoUrl = sanitizeString(photo_url, 500);
  if (cleanPhotoUrl && !/^https?:\/\/.+/.test(cleanPhotoUrl)) {
    return res.status(400).json({ error: "URL de photo invalide" });
  }

  try {
    // Vérifier si un profil livreur existe déjà
    const { data: existing } = await supa
      .from("livreurs").select("id, status").eq("user_id", req.user.id).maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ error: "Une demande est déjà en attente de validation" });
      }
      if (existing.status === "approved") {
        return res.status(400).json({ error: "Vous êtes déjà inscrit comme livreur" });
      }
    }

    const { data, error } = await supa.from("livreurs").upsert({
      user_id: req.user.id,
      vehicule: cleanVehicule,
      zone_travail: cleanZone,
      photo_url: cleanPhotoUrl,
      status: "pending"
    }).select().single();
    if (error) throw error;

    const { data: admins } = await supa.from("admins").select("user_id");
    if (admins?.length > 0) {
      await supa.from("notifications").insert(
        admins.map((admin) => ({
          user_id: admin.user_id,
          type: "livreur",
          title: "Demande d'inscription livreur",
          message: `${sanitizeString(req.profile.name, 100)} a soumis une demande pour devenir livreur.`,
          data: { livreur_id: data.id }
        }))
      );
    }
    res.status(201).json({ message: "Demande soumise avec succès", livreur: data });
  } catch (err) {
    console.error("Erreur inscription livreur:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription livreur" });
  }
});

// PATCH /api/livreurs/:id/status — admin approuve/refuse
router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const livreurId = req.params.id;
  if (!UUID_REGEX.test(livreurId || "")) {
    return res.status(400).json({ error: "ID livreur invalide" });
  }

  const { status, admin_note } = req.body;
  if (!["approved","rejected","suspended"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const cleanAdminNote = sanitizeString(admin_note, 300);
  try {
    const { data, error } = await supa.from("livreurs")
      .update({ status, admin_note: cleanAdminNote })
      .eq("id", livreurId)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Livreur introuvable" });
      }
      throw error;
    }

    const msgs = {
      approved:  "Félicitations ! Votre inscription en tant que livreur a été approuvée. Vous pouvez commencer à accepter des missions.",
      rejected:  "Votre demande d'inscription livreur a été refusée. " + (cleanAdminNote || ""),
      suspended: "Votre compte livreur a été temporairement suspendu. Contactez le support."
    };

    await supa.from("notifications").insert({
      user_id: data.user_id,
      title: status === "approved" ? "Inscription approuvée ✅" : status === "rejected" ? "Demande refusée" : "Compte suspendu",
      message: msgs[status],
      type: status === "approved" ? "success" : "system",
      data: { livreur_id: data.id }
    });

    res.json({ message: "Statut mis à jour", livreur: data });
  } catch (err) {
    console.error("Erreur mise à jour statut livreur:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut" });
  }
});

// PATCH /api/livreurs/location — livreur met à jour sa position GPS
router.patch("/location", requireAuth, requireRole("livreur"), async (req, res) => {
  const { lat, lng, is_online } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées GPS requises" });
  }

  const cleanLat = Number(lat);
  const cleanLng = Number(lng);
  if (!Number.isFinite(cleanLat) || !Number.isFinite(cleanLng) ||
      Math.abs(cleanLat) > 90 || Math.abs(cleanLng) > 180) {
    return res.status(400).json({ error: "Coordonnées GPS invalides" });
  }

  try {
    const { error } = await supa.from("livreurs")
      .update({ current_lat: cleanLat, current_lng: cleanLng, is_online: is_online === true ? true : false })
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Position mise à jour" });
  } catch (err) {
    console.error("Erreur mise à jour position:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de la position" });
  }
});

module.exports = router;