const jwt    = require("jsonwebtoken");
const supa   = require("../services/supabase");

// Vérifie le JWT Supabase et charge le profil utilisateur
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    // Vérification via Supabase Auth
    const { data: { user }, error } = await supa.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Token invalide" });

    // Charger le profil depuis la DB
    const { data: profile } = await supa
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    req.user   = user;
    req.profile = profile;
    next();
  } catch {
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