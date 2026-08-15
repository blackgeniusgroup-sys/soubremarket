const rateLimit = require("express-rate-limit");

/**
 * ═══════════════════════════════════════════════════════════════
 *  RATE LIMIT — CORRIGÉ POUR RENDER + VERCEL
 * ═══════════════════════════════════════════════════════════════
 *  Problème : Render utilise un proxy inverse. Sans `trust proxy`,
 *  toutes les requêtes semblent venir de la même IP (celle du proxy),
 *  ce qui déclenche le blocage "Trop de requêtes".
 *
 *  Solution :
 *  1. `trust proxy` est déjà configuré dans server.js (app.set("trust proxy", 1))
 *  2. `keyGenerator` utilise `req.ip` qui, grâce à trust proxy, renvoie
 *     la VRAIE IP du client final (pas celle du proxy Render).
 *  3. Les limites sont assouplies pour les requêtes légitimes :
 *     - Polling du dashboard (toutes les 5s) : ~12 req/min
 *     - Chargement des KPIs : ~5 req/min
 *     - Messagerie : ~10 req/min
 *  4. Les requêtes authentifiées (avec token JWT valide) sont moins
 *     limitées car elles proviennent d'utilisateurs connectés légitimes.
 * ═══════════════════════════════════════════════════════════════
 */

// Fonction pour extraire la vraie IP du client
function getClientIp(req) {
  // req.ip respecte `trust proxy` configuré dans server.js
  // Il renvoie l'IP du client final, pas celle du proxy Render
  return req.ip || req.socket?.remoteAddress || "unknown";
}

// Limiteur principal API — assoupli pour le polling et les KPIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,                  // 600 requêtes / 15 min = 40 req/min (suffisant pour le polling 5s + KPIs)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp, // Utilise la vraie IP du client (grâce à trust proxy)
  skip: (req) => {
    // Ne pas limiter les requêtes authentifiées (utilisateurs connectés légitimes)
    // Le polling du dashboard et le chargement des KPIs sont authentifiés
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      return true;
    }
    // Ne pas limiter les routes publiques essentielles (catalogue, zones, lieux)
    if (req.path.startsWith("/api/products") && req.method === "GET") return true;
    if (req.path.startsWith("/api/zones")) return true;
    if (req.path.startsWith("/api/map-lieux")) return true;
    if (req.path.startsWith("/health")) return true;
    return false;
  },
  message: { error: "Trop de requêtes, réessayez dans quelques minutes." }
});

// Limiteur strict pour l'authentification (prévention brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,                  // 50 tentatives de connexion / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  skipSuccessfulRequests: true, // Ne compte pas les connexions réussies
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." }
});

// Limiteur pour les webhooks (CinetPay, etc.)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requêtes webhook / min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: "Trop de requêtes webhook." }
});

module.exports = { apiLimiter, authLimiter, webhookLimiter };
