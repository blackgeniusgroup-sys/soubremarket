/**
 * ═══════════════════════════════════════════════════════════════
 *  MIDDLEWARE DE NORMALISATION DES RÉPONSES
 *  Convertit récursivement les clés camelCase (Prisma) en
 *  snake_case (format attendu par le frontend Supabase).
 *
 *  Problème résolu :
 *  - Le backend utilise Prisma → les clés sont en camelCase
 *    (`createdAt`, `orderNumber`, `payMethod`, `vendorId`, ...)
 *  - Le frontend attend du snake_case (`created_at`, `order_number`,
 *    `pay_method`, `vendor_id`, ...) car il a été conçu pour
 *    Supabase REST.
 *
 *  Résultat : les pages de la sidebar affichent enfin les données
 *  (commandes, produits, vendeurs, clients, livreurs, finances).
 * ═══════════════════════════════════════════════════════════════
 */

const toSnake = (key) =>
  key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());

function deepToSnake(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepToSnake);
  if (typeof obj === "object") {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[toSnake(k)] = deepToSnake(v);
    }
    return result;
  }
  return obj;
}

/**
 * Middleware Express — transforme `res.json` pour convertir
 * toutes les clés en snake_case. Se place APRÈS les routes,
 * juste avant la réponse client.
 */
function normalizeResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    return originalJson(deepToSnake(body));
  };
  next();
}

module.exports = normalizeResponse;