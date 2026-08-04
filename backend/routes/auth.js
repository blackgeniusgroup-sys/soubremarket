const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { email, password, name, type, phone } = req.body;
  if (!email || !password || !name || !type) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }
  if (!["client","vendor","livreur", "vendeur", "admin"].includes(type)) {
    return res.status(400).json({ error: "Type invalide" });
  }

  try {
    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authErr } = await supa.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { name, type, phone }
    });
    if (authErr) return res.status(400).json({ error: authErr.message });

    // Le trigger SQL crée automatiquement le profil
    // Pour livreur : statut pending par défaut
    if (type === "vendor") {
      const { shop_name, whatsapp, address } = req.body;
      await supa.from("vendors").insert({
        user_id:   authData.user.id,
        shop_name: shop_name || name,
        whatsapp,
        address
      });
    }

    // Notification admin si nouveau livreur
    if (type === "livreur") {
      const adminProfiles = await supa
        .from("profiles").select("id").eq("type","admin");
      if (adminProfiles.data?.length > 0) {
        await supa.from("notifications").insert(
          adminProfiles.data.map(a => ({
            user_id: a.id,
            title:   "Nouvelle demande livreur",
            message: `${name} a soumis une demande d'inscription livreur.`,
            type:    "livreur",
            data:    { livreur_user_id: authData.user.id }
          }))
        );
      }
    }

    res.status(201).json({ message: "Compte créé avec succès", user_id: authData.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) {
      console.log("DTEAIL ERREUR SUPABASE :", error);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Charger le profil
    const { data: profile } = await supa
      .from("profiles").select("*").eq("id", data.user.id).single();

    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { ...data.user, profile }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req, res) => {
  await supa.auth.admin.signOut(req.headers.authorization.replace("Bearer ",""));
  res.json({ message: "Déconnexion réussie" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});

module.exports = router;