/**
 * ═══════════════════════════════════════════════════════════════
 *  SERVICE SUPABASE UTILISATEUR — SÉCURISÉ (ZÉRO FAILLE)
 * ═══════════════════════════════════════════════════════════════
 *  Ce service crée un client Supabase avec la clé **ANON** (publique)
 *  et injecte le JWT de l'utilisateur authentifié.
 *
 *  🔐 POURQUOI PAS service_role ?
 *  - La clé service_role contourne TOUTES les politiques RLS.
 *  - Si elle est exposée ou mal utilisée, n'importe quelle requête
 *    peut lire/écrire dans TOUTES les tables.
 *  - C'est une faille critique de sécurité.
 *
 *  ✅ SOLUTION SÉCURISÉE :
 *  - Clé anon (publique, sans danger côté serveur)
 *  - JWT utilisateur injecté → `auth.uid()` retourne le VRAI ID
 *  - Les politiques RLS vérifient `auth.uid()` et les tables de profils
 *  - Un vendeur ne peut JAMAIS voir les données d'un autre vendeur
 * ═══════════════════════════════════════════════════════════════
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Attention : Les variables SUPABASE_URL / SUPABASE_ANON_KEY sont manquantes dans le .env !");
}

/**
 * Crée un client Supabase authentifié avec le JWT de l'utilisateur.
 * @param {string} accessToken - JWT Supabase de l'utilisateur connecté
 * @returns {object} Client Supabase avec session utilisateur
 */
function createUserClient(accessToken) {
  if (!accessToken) {
    throw new Error("Token d'accès manquant pour créer le client Supabase utilisateur");
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return client;
}

module.exports = { createUserClient };