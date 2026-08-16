/**
 * ═══════════════════════════════════════════════════════════════
 *  ROUTES NOTIFICATIONS SÉCURISÉES — CORRECTION BADGES (0)
 * ═══════════════════════════════════════════════════════════════
 *  Problème original :
 *  - `GET /api/admin/notifications` utilisait la clé service_role
 *    via le client Supabase global. Si la clé est invalide ou absente,
 *    l'API renvoie `{ notifications: [], unreadCount: 0 }` → badges à 0.
 *
 *  Solution :
 *  - Utilise Prisma (accès direct, fiable, aucun contournement RLS)
 *  - Ne renvoie QUE les notifications de l'utilisateur authentifié
 *    (`req.user.id` extrait du JWT validé — pas de confiance au body)
 *  - Les administrateurs voient leurs notifications réelles
 * ═══════════════════════════════════════════════════════════════
 */
const express = require("express");
const router = express.Router();
const prisma = require("../services/prisma");
const { requireAuth } = require("../middleware/auth");

// Toutes les routes nécessitent une authentification JWT validée
router.use(requireAuth);

// GET /api/notifications-secure — notifications réelles de l'utilisateur connecté
router.get("/", async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch(() => []),
      prisma.notification.count({
        where: { userId: req.user.id, read: false },
      }).catch(() => 0),
    ]);

    res.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (err) {
    console.error("Erreur notifications sécurisées:", err.message);
    res.status(500).json({ error: "Erreur lors du chargement des notifications" });
  }
});

// PATCH /api/notifications-sec/read-all — marquer toutes les notifications comme lues
router.patch("/read-all", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    }).catch(() => ({ count: 0 }));

    res.json({ success: true, updated: result?.count || 0 });
  } catch (err) {
    console.error("Erreur marquage notifications lues:", err.message);
    res.status(500).json({ error: "Erreur lors du marquage des notifications" });
  }
});

module.exports = router;