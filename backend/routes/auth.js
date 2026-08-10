const express = require("express");
const router = express.Router();
const supa = require("../services/supabase");
const prisma = require("../services/prisma");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

const REGISTERABLE_TYPES = ["client", "vendor", "livreur"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s-]{8,20}$/;

function validateEmail(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_REGEX.test(email);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

function validateName(name) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100;
}

function validatePhone(phone) {
  if (!phone) return true; // optionnel
  return typeof phone === "string" && PHONE_REGEX.test(phone);
}

function sanitizeString(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

function buildProfilePayload(type, userId, name, phone, body) {
  const base = {
    userId,
    name,
    phone: phone || null
  };

  if (type === "client") {
    return { ...base, address: sanitizeString(body.address, 200) || null, active: true };
  }

  if (type === "vendor") {
    return {
      ...base,
      shopName: sanitizeString(body.shop_name, 100) || name,
      whatsapp: sanitizeString(body.whatsapp, 20) || null,
      address: sanitizeString(body.address, 200) || null,
      active: false
    };
  }

  if (type === "livreur") {
    return {
      ...base,
      status: "pending",
      active: false,
      vehicule: sanitizeString(body.vehicule, 100) || null,
      zoneTravail: sanitizeString(body.zone_travail || body.zone, 100) || null,
      photoUrl: sanitizeString(body.photo_url, 500) || null
    };
  }

  return base;
}

async function createProfile(type, userId, name, phone, body) {
  if (type === "client") {
    return prisma.client.create({ data: buildProfilePayload(type, userId, name, phone, body) });
  }

  if (type === "vendor") {
    return prisma.vendor.create({ data: buildProfilePayload(type, userId, name, phone, body) });
  }

  if (type === "livreur") {
    return prisma.livreur.create({ data: buildProfilePayload(type, userId, name, phone, body) });
  }

  return null;
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { email, password, name, type, phone } = req.body;

  if (!email || !password || !name || !type) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }
  if (!REGISTERABLE_TYPES.includes(type)) {
    return res.status(400).json({ error: "Type invalide" });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Adresse email invalide" });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
  }
  if (!validateName(name)) {
    return res.status(400).json({ error: "Le nom doit contenir entre 2 et 100 caractères" });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide" });
  }

  try {
    const { data: authData, error: authErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: sanitizeString(name, 100), type, phone: phone || null }
    });
    if (authErr) {
      // Ne pas exposer les détails internes
      const message = authErr.message?.includes("already") 
        ? "Un compte avec cet email existe déjà"
        : "Erreur lors de la création du compte";
      return res.status(400).json({ error: message });
    }

    await createProfile(type, authData.user.id, sanitizeString(name, 100), phone, req.body);

    // Notification admin si nouveau livreur
    if (type === "livreur") {
      const admins = await prisma.admins.findMany({ select: { user_id: true } });
      if (admins.length > 0) {
        await supa.from("notifications").insert(
          admins.map((admin) => ({
            user_id: admin.user_id,
            title: "Nouvelle demande livreur",
            message: `${sanitizeString(name, 100)} a soumis une demande d'inscription livreur.`,
            type: "livreur",
            data: { livreur_user_id: authData.user.id }
          }))
        );
      }
    }

    res.status(201).json({ message: "Compte créé avec succès", user_id: authData.user.id });
  } catch (err) {
    console.error("Erreur inscription:", err);
    res.status(500).json({ error: "Erreur lors de la création du compte" });
  }
});

router.post("/register-admin", authLimiter, requireAuth, async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, mot de passe et nom requis" });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Adresse email invalide" });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
  }
  if (!validateName(name)) {
    return res.status(400).json({ error: "Le nom doit contenir entre 2 et 100 caractères" });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide" });
  }

  if (req.profile?.type !== "superadmin") {
    return res.status(403).json({ error: "Seul le superadmin peut créer un administrateur" });
  }

  try {
    const { data: authData, error: authErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: sanitizeString(name, 100), type: "admin", phone: phone || null }
    });
    if (authErr) {
      const message = authErr.message?.includes("already exists")
        ? "Un compte avec cet email existe déjà"
        : "Erreur lors de la création de l'administrateur";
      return res.status(400).json({ error: message });
    }

    await prisma.admins.create({
      data: {
        user_id: authData.user.id,
        name: sanitizeString(name, 100),
        phone: phone || null,
        active: true
      }
    });

    res.status(201).json({ message: "Administrateur créé avec succès", user_id: authData.user.id });
  } catch (err) {
    console.error("Erreur création admin:", err);
    res.status(500).json({ error: "Erreur lors de la création de l'administrateur" });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const userId = data.user.id;
    const [superAdmin, admin, client, vendor, livreur] = await Promise.all([
      prisma.superadmins.findUnique({ where: { user_id: userId } }),
      prisma.admins.findUnique({ where: { user_id: userId } }),
      prisma.client.findUnique({ where: { userId: userId } }),
      prisma.vendor.findUnique({ where: { userId: userId } }),
      prisma.livreur.findUnique({ where: { userId: userId } })
    ]);

    const profile = superAdmin || admin || client || vendor || livreur;
    if (!profile) {
      return res.status(404).json({ error: "Profil utilisateur introuvable" });
    }

    // Vérifier que le compte est actif
    if (profile.active === false) {
      return res.status(403).json({ error: "Compte désactivé. Contactez l'administrateur." });
    }

    // Vérifier le statut du livreur
    if (livreur && livreur.status === "suspended") {
      return res.status(403).json({ error: "Compte livreur suspendu. Contactez l'administrateur." });
    }

    const type = superAdmin ? "superadmin"
      : admin ? "admin"
      : client ? "client"
      : vendor ? "vendor"
      : "livreur";

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { ...data.user, profile: { ...profile, type } }
    });
  } catch (err) {
    console.error("Erreur connexion:", err);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      await supa.auth.admin.signOut(authHeader.slice(7));
    }
    res.json({ message: "Déconnexion réussie" });
  } catch (err) {
    console.error("Erreur déconnexion:", err);
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});

module.exports = router;