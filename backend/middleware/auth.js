const supa   = require("../services/supabase");
const prisma = require("../services/prisma");

async function loadProfile(userId) {
  const [superAdmin, admin, client, vendor, livreur] = await Promise.all([
    prisma.superadmins.findUnique({ where: { user_id: userId } }),
    prisma.admins.findUnique({ where: { user_id: userId } }),
    prisma.client.findUnique({ where: { userId } }),
    prisma.vendor.findUnique({ where: { userId } }),
    prisma.livreur.findUnique({ where: { userId } })
  ]);

  if (superAdmin) return { ...superAdmin, type: "superadmin" };
  if (admin) return { ...admin, type: "admin" };
  if (client) return { ...client, type: "client" };
  if (vendor) return { ...vendor, type: "vendor" };
  if (livreur) return { ...livreur, type: "livreur" };
  return null;
}

// Vérifie le JWT Supabase et charge le profil utilisateur
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou format invalide" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const { data: { user }, error } = await supa.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Token invalide ou expiré" });

    const profile = await loadProfile(user.id);
    if (!profile) return res.status(403).json({ error: "Profil introuvable" });

    // Vérifier que le compte est actif
    if (profile.active === false) {
      return res.status(403).json({ error: "Compte désactivé. Contactez l'administrateur." });
    }

    // Pour les livreurs, vérifier le statut
    if (profile.type === "livreur" && profile.status === "suspended") {
      return res.status(403).json({ error: "Compte livreur suspendu. Contactez l'administrateur." });
    }

    req.user = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error("Erreur authentification:", err);
    return res.status(401).json({ error: "Authentification échouée" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.type)) {
      return res.status(403).json({ error: "Accès interdit — rôle insuffisant" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };