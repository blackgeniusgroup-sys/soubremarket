/**
 * ═══════════════════════════════════════════════════════════════
 *  SERVICE KPIs — ROBUSTE AVEC FALLBACKS
 * ═══════════════════════════════════════════════════════════════
 *  Ce service récupère les statistiques clés via Prisma/Supabase
 *  avec des blocs try/catch et des valeurs de secours (fallbacks).
 *
 *  Garantie : l'interface s'affiche TOUJOURS, même si une table
 *  est vide, asynchrone, ou si la base de données est temporairement
 *  injoignable. Chaque métrique a un fallback à 0 ou [].
 * ═══════════════════════════════════════════════════════════════
 */

const prisma = require("./prisma");
const supa   = require("./supabase");

// Valeurs de secours par défaut — l'interface ne plante JAMAIS
const FALLBACK_STATS = {
  total_clients:      0,
  total_vendors:      0,
  total_livreurs:     0,
  pending_livreurs:   0,
  total_orders:       0,
  active_deliveries:  0,
  total_commission:   0,
  total_gmv:          0,
  pending_comments:   0,
  total_products:     0,
  recent_orders:      [],
  recent_products:    [],
  monthly_revenue:    [],
};

/**
 * Compte les enregistrements d'une table Supabase avec fallback à 0.
 * N'échoue JAMAIS — retourne 0 en cas d'erreur.
 */
async function safeCount(table, filterColumn = null, filterValue = null) {
  try {
    let query = supa.from(table).select("*", { count: "exact", head: true });
    if (filterColumn && filterValue !== undefined && filterValue !== null) {
      query = query.eq(filterColumn, filterValue);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error(`⚠️ KPI safeCount(${table}) → fallback 0 :`, err.message);
    return 0;
  }
}

/**
 * Récupère les KPIs principaux du tableau de bord.
 * Utilise Prisma d'abord, puis Supabase en secours, puis des fallbacks.
 */
async function getKpis() {
  const result = { ...FALLBACK_STATS };

  // ─── 1. TENTATIVE PRISMA (le plus robuste) ───
  try {
    const [
      total_clients,
      total_vendors,
      total_livreurs_approved,
      pending_livreurs,
      total_orders,
      active_deliveries,
      pending_comments,
      total_products,
    ] = await Promise.all([
      prisma.client.count().catch(() => 0),
      prisma.vendor.count().catch(() => 0),
      prisma.livreur.count({ where: { status: "approved" } }).catch(() => 0),
      prisma.livreur.count({ where: { status: "pending" } }).catch(() => 0),
      prisma.order.count().catch(() => 0),
      prisma.order.count({ where: { status: "delivering" } }).catch(() => 0),
      prisma.comment.count({ where: { approved: false } }).catch(() => 0),
      prisma.product.count({ where: { active: true } }).catch(() => 0),
    ]);

    // Commandes livrées pour GMV et commissions
    const delivered = await prisma.order.findMany({
      where: { status: "delivered" },
      select: { commission: true, total: true },
    }).catch(() => []);

    const total_commission = delivered.reduce((s, o) => s + (Number(o.commission) || 0), 0);
    const total_gmv         = delivered.reduce((s, o) => s + (Number(o.total) || 0), 0);

    Object.assign(result, {
      total_clients,
      total_vendors,
      total_livreurs: total_livreurs_approved,
      pending_livreurs,
      total_orders,
      active_deliveries,
      pending_comments,
      total_products,
      total_commission,
      total_gmv,
    });

    // Si Prisma a donné des résultats, on retourne directement
    if (total_clients > 0 || total_orders > 0 || total_vendors > 0) {
      return result;
    }
  } catch (err) {
    console.error("⚠️ KPI Prisma échec → bascule Supabase :", err.message);
  }

  // ─── 2. SECOURS SUPABASE (si Prisma a échoué ou tables vides) ───
  try {
    const [
      total_clients,
      total_vendors,
      total_livreurs,
      pending_livreurs,
      total_orders,
      active_deliveries,
      pending_comments,
      total_products,
    ] = await Promise.all([
      safeCount("clients"),
      safeCount("vendors"),
      safeCount("livreurs", "status", "approved"),
      safeCount("livreurs", "status", "pending"),
      safeCount("orders"),
      safeCount("orders", "status", "delivering"),
      safeCount("comments", "approved", false),
      safeCount("products", "active", true),
    ]);

    let total_commission = 0;
    let total_gmv = 0;
    try {
      const { data: deliveredOrders, error } = await supa
        .from("orders")
        .select("commission,total")
        .eq("status", "delivered");
      if (!error) {
        for (const order of deliveredOrders || []) {
          total_commission += Number(order.commission) || 0;
          total_gmv         += Number(order.total) || 0;
        }
      }
    } catch (e) {
      console.error("⚠️ KPI commission GMV → fallback 0 :", e.message);
    }

    Object.assign(result, {
      total_clients,
      total_vendors,
      total_livreurs,
      pending_livreurs,
      total_orders,
      active_deliveries,
      pending_comments,
      total_products,
      total_commission,
      total_gmv,
    });
  } catch (err) {
    console.error("⚠️ KPI Supabase échec → fallbacks à 0 :", err.message);
  }

  return result;
}

/**
 * Récupère les dernières commandes (pour le tableau de bord).
 * Fallback : tableau vide.
 */
async function getRecentOrders(limit = 10) {
  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, phone: true } },
        vendor: { select: { name: true, shopName: true } },
      },
    });
    return orders;
  } catch (err) {
    console.error("⚠️ KPI recentOrders → fallback [] :", err.message);
    try {
      const { data, error } = await supa
        .from("orders")
        .select("*, clients(name, phone), vendors(name, shop_name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      return error ? [] : (data || []);
    } catch (e) {
      return [];
    }
  }
}

/**
 * Récupère les revenus mensuels (12 derniers mois).
 * Fallback : tableau de 12 mois à 0.
 */
async function getMonthlyRevenue() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }) + " " + String(d.getFullYear()).slice(2),
      value: 0,
    });
  }

  try {
    const delivered = await prisma.order.findMany({
      where: { status: "delivered" },
      select: { commission: true, createdAt: true },
    });

    const map = {};
    months.forEach(m => { map[m.key] = m; });
    for (const order of delivered || []) {
      if (!order.createdAt) continue;
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (map[key]) map[key].value += Number(order.commission) || 0;
    }
  } catch (err) {
    console.error("⚠️ KPI monthlyRevenue → fallback 0 :", err.message);
    try {
      const { data, error } = await supa
        .from("orders")
        .select("commission, created_at")
        .eq("status", "delivered");
      if (!error) {
        const map = {};
        months.forEach(m => { map[m.key] = m; });
        for (const order of data || []) {
          if (!order.created_at) continue;
          const d = new Date(order.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (map[key]) map[key].value += Number(order.commission) || 0;
        }
      }
    } catch (e) {
      // fallback déjà en place
    }
  }

  return months;
}

module.exports = { getKpis, getRecentOrders, getMonthlyRevenue, FALLBACK_STATS };