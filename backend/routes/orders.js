const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

// POST /api/orders — passer une commande
router.post("/", requireAuth, requireRole("client"), async (req, res) => {
  const { items, zone_id, delivery_addr, delivery_lat, delivery_lng, pay_method, notes } = req.body;

  if (!items?.length || !delivery_addr || !zone_id || !pay_method) {
    return res.status(400).json({ error: "Données de commande incomplètes" });
  }

  try {
    // Récupérer la zone
    const { data: zone } = await supa.from("zones").select("*").eq("id", zone_id).single();
    if (!zone) return res.status(400).json({ error: "Zone invalide" });

    // Récupérer les produits avec leur vendeur
    const productIds = items.map(i => i.product_id);
    const { data: products } = await supa
      .from("products").select("*, vendors(id,shop_name,address)")
      .in("id", productIds).eq("active", true);

    if (products.length !== items.length) {
      return res.status(400).json({ error: "Un ou plusieurs produits sont indisponibles" });
    }

    // Vérifier le stock
    for (const item of items) {
      const p = products.find(x => x.id === item.product_id);
      if (p.stock < item.qty) {
        return res.status(400).json({ error: `Stock insuffisant pour ${p.name}` });
      }
    }

    // Récupérer le taux de commission
    const { data: commSetting } = await supa
      .from("settings").select("value").eq("key","commission_rate").single();
    const commRate = parseFloat(commSetting?.value || "10") / 100;

    // Calcul des totaux
    const subtotal     = items.reduce((s, item) => {
      const p = products.find(x => x.id === item.product_id);
      return s + p.price * item.qty;
    }, 0);
    const commission   = Math.round(subtotal * commRate);
    const delivery_fee = zone.price;
    const total        = subtotal + commission + delivery_fee;
    const vendor_id    = products[0].vendors.id;

    // Créer la commande
    const { data: order, error: orderErr } = await supa.from("orders").insert({
      client_id: req.user.id, vendor_id,
      zone_id:   +zone_id, status: "pending", pay_method,
      subtotal, commission, delivery_fee, total,
      delivery_addr, delivery_lat, delivery_lng,
      vendor_addr: products[0].vendors.address,
      notes
    }).select().single();
    if (orderErr) throw orderErr;

    // Créer les lignes de commande
    const orderItems = items.map(item => {
      const p = products.find(x => x.id === item.product_id);
      return {
        order_id: order.id, product_id: item.product_id,
        name: p.name, price: p.price, emoji: p.emoji,
        qty: item.qty, subtotal: p.price * item.qty
      };
    });
    await supa.from("order_items").insert(orderItems);

    // Notifier le vendeur
    const { data: vendorProfile } = await supa
      .from("vendors").select("user_id").eq("id", vendor_id).single();
    if (vendorProfile) {
      await supa.from("notifications").insert({
        user_id: vendorProfile.user_id,
        title:   "Nouvelle commande !",
        message: `Commande ${order.order_number} reçue — ${items.length} article(s) — ${total.toLocaleString("fr-FR")} F CFA`,
        type:    "order",
        data:    { order_id: order.id }
      });
    }

    res.status(201).json({
      message: "Commande créée avec succès",
      order:   { ...order, items: orderItems }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — mes commandes
router.get("/", requireAuth, async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;
  try {
    let q = supa.from("orders_full").select("*").range(+offset, +offset + +limit - 1);

    if (req.profile.type === "client")  q = q.eq("client_id", req.user.id);
    if (req.profile.type === "livreur") {
      const { data: liv } = await supa.from("livreurs").select("id").eq("user_id",req.user.id).single();
      q = q.eq("livreur_id", liv?.id);
    }
    if (status) q = q.eq("status", status);
    q = q.order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    res.json({ orders: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supa
      .from("orders_full").select("*").eq("id", req.params.id).single();
    if (error) return res.status(404).json({ error: "Commande introuvable" });

    // Charger les items
    const { data: items } = await supa
      .from("order_items").select("*").eq("order_id", req.params.id);

    res.json({ ...data, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status — livreur met à jour le statut
router.patch("/:id/status", requireAuth, requireRole("livreur","admin"), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["assigned","picked","delivering","delivered","cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    const { data, error } = await supa
      .from("orders").update({ status }).eq("id", req.params.id).select().single();
    if (error) throw error;
    // Le trigger SQL envoie automatiquement la notification au client
    res.json({ message: "Statut mis à jour", order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/assign — admin assigne un livreur
router.patch("/:id/assign", requireAuth, requireRole("admin"), async (req, res) => {
  const { livreur_id } = req.body;
  if (!livreur_id) return res.status(400).json({ error: "livreur_id requis" });
  try {
    const { data: livreur } = await supa
      .from("livreurs").select("id,user_id").eq("id",livreur_id).eq("status","approved").single();
    if (!livreur) return res.status(400).json({ error: "Livreur invalide ou non approuvé" });

    const { data, error } = await supa.from("orders")
      .update({ livreur_id, status: "assigned" })
      .eq("id", req.params.id).select().single();
    if (error) throw error;

    // Notifier le livreur
    await supa.from("notifications").insert({
      user_id: livreur.user_id,
      title:   "Nouvelle mission !",
      message: `Vous avez une nouvelle livraison assignée — ${data.order_number}`,
      type:    "delivery",
      data:    { order_id: data.id }
    });

    res.json({ message: "Livreur assigné", order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;