const express = require("express");
const router = express.Router();
const prisma = require("../services/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ["pending", "assigned", "picked", "delivering", "delivered", "cancelled"];
const MAX_QTY_PER_ITEM = 100;
const MAX_ITEMS_PER_ORDER = 50;
const MAX_ADDR_LENGTH = 300;
const MAX_NOTES_LENGTH = 500;

function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD${timestamp}${random}`;
};

// POST /api/orders — passer une commande
router.post("/", requireAuth, requireRole("client"), async (req, res) => {
  const { items, zone_id, delivery_addr, delivery_lat, delivery_lng, pay_method, notes } = req.body;

  if (!items?.length || !delivery_addr || !zone_id || !pay_method) {
    return res.status(400).json({ error: "Données de commande incomplètes" });
  }

  // Validation des items
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS_PER_ORDER) {
    return res.status(400).json({ error: `Entre 1 et ${MAX_ITEMS_PER_ORDER} articles par commande` });
  }

  const validPayMethods = ["cash", "wave", "orange_money", "moov_money", "mtn_money"];
  if (!validPayMethods.includes(pay_method)) {
    return res.status(400).json({ error: "Méthode de paiement invalide" });
  }

  const zoneId = Number(zone_id);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ error: "Zone invalide" });
  }

  const cleanDeliveryAddr = sanitizeString(delivery_addr, MAX_ADDR_LENGTH);
  if (!cleanDeliveryAddr) {
    return res.status(400).json({ error: "Adresse de livraison invalide" });
  }

  const cleanNotes = sanitizeString(notes, MAX_NOTES_LENGTH);

  // Validation de chaque item
  for (const item of items) {
    if (!item?.product_id || !UUID_REGEX.test(item.product_id)) {
      return res.status(400).json({ error: "ID de produit invalide" });
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return res.status(400).json({ error: `Quantité invalide (1-${MAX_QTY_PER_ITEM})` });
    }
  }

  // Validation coordonnées GPS (si fournies)
  let lat = null, lng = null;
  if (delivery_lat !== undefined && delivery_lng !== undefined) {
    lat = Number(delivery_lat);
    lng = Number(delivery_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: "Coordonnées GPS invalides" });
    }
  }

  try {
    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || zone.active === false) return res.status(400).json({ error: "Zone invalide" });

    const productIds = items.map(item => item.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { vendor: true }
    });

    if (products.length !== items.length) {
      return res.status(400).json({ error: "Un ou plusieurs produits sont indisponibles" });
    }

    const vendorIds = [...new Set(products.map(p => p.vendorId))];
    if (vendorIds.length !== 1) {
      return res.status(400).json({ error: "Tous les produits doivent appartenir au même vendeur" });
    }

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return res.status(400).json({ error: "Produit introuvable" });
      if (product.stock < Number(item.qty)) {
        return res.status(400).json({ error: `Stock insuffisant pour ${product.name}` });
      }
    }

    const commSetting = await prisma.setting.findUnique({ where: { key: "commission_rate" } });
    const commRate = parseFloat(commSetting?.value || "10") / 100;
    if (!Number.isFinite(commRate) || commRate < 0 || commRate > 1) {
      return res.status(500).json({ error: "Configuration de commission invalide" });
    }

    const subtotal = items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product?.price || 0) * Number(item.qty);
    }, 0);
    const commission = Math.round(subtotal * commRate);
    const deliveryFee = zone.price;
    const total = subtotal + commission + deliveryFee;
    const vendor = products[0].vendor;

    // Vérifier que le vendeur est actif
    if (vendor.active === false) {
      return res.status(400).json({ error: "Le vendeur de ce produit est actuellement indisponible" });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        clientId: req.user.id,
        vendorId: vendor.userId,
        zoneId: zone.id,
        status: "pending",
        payMethod: pay_method,
        subtotal,
        commission,
        deliveryFee,
        total,
        deliveryAddr: cleanDeliveryAddr,
        deliveryLat: lat,
        deliveryLng: lng,
        vendorAddr: vendor.address,
        notes: cleanNotes,
        orderItems: {
          create: items.map(item => {
            const product = products.find(p => p.id === item.product_id);
            return {
              productId: item.product_id,
              name: product.name,
              price: product.price,
              emoji: product.emoji,
              qty: Number(item.qty),
              subtotal: product.price * Number(item.qty)
            };
          })
        }
      },
      include: { orderItems: true }
    });

    // Décrémenter le stock (utilisation de transactions Prisma)
    await prisma.$transaction(
      items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return prisma.product.update({
          where: { id: product.id },
          data: { stock: { decrement: Number(item.qty) } }
        });
      })
    );

    if (vendor.userId) {
      await prisma.notification.create({
        data: {
          userId: vendor.userId,
          title: "Nouvelle commande !",
          message: `Commande ${order.orderNumber} reçue — ${items.length} article(s) — ${total.toLocaleString("fr-FR")} F CFA`,
          type: "order",
          data: { order_id: order.id }
        }
      });
    }

    res.status(201).json({
      message: "Commande créée avec succès",
      order
    });
  } catch (err) {
    console.error("Erreur création commande:", err);
    res.status(500).json({ error: "Erreur lors de la création de la commande" });
  }
});

// GET /api/orders — mes commandes
router.get("/", requireAuth, async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;

  // Pagination stricte
  const pageLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
  const pageOffset = Math.max(parseInt(offset) || 0, 0);

  // Validation du statut
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const where = {};

    if (req.profile.type === "client") {
      where.clientId = req.user.id;
    }

    if (req.profile.type === "livreur") {
      // Un livreur voit les commandes disponibles (pending) OU ses propres missions en cours
      if (status === "pending") {
        where.status = "pending";
        where.livreurId = { is: null };
      } else {
        const livreur = await prisma.livreur.findUnique({
          where: { userId: req.user.id },
          select: { userId: true }
        });
        if (!livreur) return res.json({ orders: [], total: 0 });
        where.livreurId = livreur.userId;
        if (status) where.status = status;
      }
    } else if (req.profile.type === "vendor") {
      where.vendorId = req.user.id;
      if (status) where.status = status;
    } else if (req.profile.type === "admin" || req.profile.type === "superadmin") {
      if (status) where.status = status;
    } else {
      return res.status(403).json({ error: "Accès interdit" });
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: pageOffset,
        take: pageLimit,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: true,
          client: { select: { userId: true, name: true, phone: true, address: true } },
          vendor: { select: { userId: true, shopName: true, address: true, whatsapp: true } },
          livreur: { select: { userId: true, name: true, phone: true, status: true } },
          zone: true
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({ orders, total });
  } catch (err) {
    console.error("Erreur liste commandes:", err);
    res.status(500).json({ error: "Erreur lors du chargement des commandes" });
  }
});

// GET /api/orders/:id
router.get("/:id", requireAuth, async (req, res) => {
  const orderId = req.params.id;
  if (!UUID_REGEX.test(orderId || "")) {
    return res.status(400).json({ error: "ID de commande invalide" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        client: { select: { userId: true, name: true, phone: true, address: true } },
        vendor: { select: { userId: true, shopName: true, address: true, whatsapp: true } },
        livreur: { select: { userId: true, name: true, phone: true, status: true } },
        zone: true
      }
    });

    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    // Vérification d'autorisation — IDOR
    const isClient = req.profile.type === "client" && order.clientId === req.user.id;
    const isVendor = req.profile.type === "vendor" && order.vendorId === req.user.id;
    const isLivreur = req.profile.type === "livreur" && order.livreurId === req.user.id;
    const isAdmin = req.profile.type === "admin" || req.profile.type === "superadmin";

    if (!isClient && !isVendor && !isLivreur && !isAdmin) {
      return res.status(403).json({ error: "Accès non autorisé à cette commande" });
    }

    res.json(order);
  } catch (err) {
    console.error("Erreur affichage commande:", err);
    res.status(500).json({ error: "Erreur lors du chargement de la commande" });
  }
});

// PATCH /api/orders/:id/status — livreur ou admin met à jour le statut
router.patch("/:id/status", requireAuth, requireRole("livreur","admin","superadmin"), async (req, res) => {
  const orderId = req.params.id;
  if (!UUID_REGEX.test(orderId || "")) {
    return res.status(400).json({ error: "ID de commande invalide" });
  }

  const { status } = req.body;
  const validStatuses = ["assigned","picked","delivering","delivered","cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    // Charger la commande AVANT pour vérifier les autorisations
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, livreurId: true, status: true, clientId: true, orderNumber: true }
    });

    if (!existing) return res.status(404).json({ error: "Commande introuvable" });

    // Un livreur ne peut modifier QUE ses propres missions
    if (req.profile.type === "livreur") {
      if (existing.livreurId !== req.user.id) {
        return res.status(403).json({ error: "Vous ne pouvez pas modifier cette commande" });
      }
      if (existing.status === "delivered" || existing.status === "cancelled") {
        return res.status(400).json({ error: "Cette commande est déjà terminée" });
      }
    }

    // Si un livreur accepte une mission (status=assigned), on l'assigne automatiquement
    const data = { status };
    if (req.profile.type === "livreur" && status === "assigned") {
      data.livreurId = req.user.id;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: { client: { select: { userId: true } } }
    });

    // Notifier le client
    await prisma.notification.create({
      data: {
        userId: order.client.userId,
        title: "Mise à jour de votre commande",
        message: `Votre commande ${order.orderNumber} est maintenant : ${status}`,
        type: "order",
        data: { order_id: order.id, status }
      }
    });

    res.json({ message: "Statut mis à jour", order });
  } catch (err) {
    console.error("Erreur mise à jour statut:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut" });
  }
});

// PATCH /api/orders/:id/assign — admin/superadmin assigne un livreur
router.patch("/:id/assign", requireAuth, requireRole("admin","superadmin"), async (req, res) => {
  const orderId = req.params.id;
  if (!UUID_REGEX.test(orderId || "")) {
    return res.status(400).json({ error: "ID de commande invalide" });
  }

  const { livreur_id } = req.body;
  if (!livreur_id || !UUID_REGEX.test(livreur_id)) {
    return res.status(400).json({ error: "livreur_id valide requis" });
  }
  try {
    const livreur = await prisma.livreur.findUnique({
      where: { userId: livreur_id },
      select: { userId: true, name: true, status: true }
    });
    if (!livreur || livreur.status !== "approved") {
      return res.status(400).json({ error: "Livreur invalide ou non approuvé" });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { livreurId: livreur.userId, status: "assigned" }
    });

    // Notifier le livreur
    await prisma.notification.create({
      data: {
        userId: livreur.userId,
        title: "Nouvelle mission !",
        message: `Vous avez une nouvelle livraison assignée — ${order.orderNumber}`,
        type: "delivery",
        data: { order_id: order.id }
      }
    });

    res.json({ message: "Livreur assigné", order });
  } catch (err) {
    console.error("Erreur assignation:", err);
    res.status(500).json({ error: "Erreur lors de l'assignation du livreur" });
  }
});

module.exports = router;