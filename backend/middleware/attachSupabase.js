/**
 * ═══════════════════════════════════════════════════════════════
 *  MIDDLEWARE — ATTACHE LE CLIENT SUPABASE UTILISATEUR
 * ═══════════════════════════════════════════════════════════════
 *  Injecte `req.supabase` : un client Supabase authentifié avec le
 *  JWT de l'utilisateur connecté (clé ANON + Bearer token).
 *
 *  Résultat :
 *  - `auth.uid()` retourne le VRAI ID utilisateur côté Supabase
 *  - Les politiques RLS s'appliquent (ZÉRO contournement service_role)
 *  - Un vendeur ne peut JAMAIS lire/écrire les données d'autrui
 *
 *  ⚠️ SÉCURITÉ — ID-SPOOFING :
 *  - Le token est extrait UNIQUEMENT depuis l'en-tête Authorization
 *  - JAMAIS depuis le body / query params
 *  - `requireAuth` (middleware/auth.js) a DÉJÀ validé le JWT
 *    et chargé le profil utilisateur avant ce middleware
 * ═══════════════════════════════════════════════════════════════
 */
const { createUserClient } = require("../services/supabaseUser");

/**
 * Middleware Express — crée le client Supabase JWT et le place sur req.supabase.
 * Doit être utilisé APRÈS requireAuth (pour avoir req.user.id).
 */
function attachSupabase(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: "Token manquant pour l'accès Supabase utilisateur" });
  }

  try {
    req.supabase = createUserClient(token);
    next();
  } catch (err) {
    console.error("Erreur création client Supabase utilisateur:", err.message);
    return res.status(500).json({ error: "Erreur lors de la création du client Supabase" });
  }
}

module.exports = attachSupabase;