const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");

// POST /api/payments/initiate — initier un paiement CinetPay
router.post("/initiate", requireAuth, requireRole("client"), async (req, res) => {
  const { order_id } = req.body;
  try {
    const { data: order } = await supa
      .from("orders").select("*").eq("id", order_id).eq("client_id", req.user.id).single();
    if (!order) return res.status(404).json({ error: "Commande introuvable" });
    if (order.pay_method === "cash") {
      return res.status(400).json({ error: "Cette commande est en paiement cash" });
    }

    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey:         process.env.CINETPAY_API_KEY,
        site_id:        process.env.CINETPAY_SITE_ID,
        transaction_id: order.order_number,
        amount:         order.total,
        currency:       "XOF",
        description:    `Commande ${order.order_number} sur SoubreMarket`,
        notify_url:     `${process.env.SERVER_URL}/api/payments/notify`,
        return_url:     `${process.env.CLIENT_URL}/suivi?order=${order.id}`,
        customer_email: req.user.email,
        customer_name:  req.profile.name,
      })
    });
    const result = await response.json();

    if (result.code !== "201") {
      return res.status(400).json({ error: "Erreur initialisation paiement", detail: result });
    }

    res.json({ payment_url: result.data.payment_url, transaction_id: order.order_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/notify — webhook CinetPay (appelé par CinetPay, pas le client)
router.post("/notify", async (req, res) => {
  const { cpm_trans_id, cpm_result, cpm_amount } = req.body;
  try {
    if (cpm_result === "00") { // Paiement réussi
      await supa.from("orders")
        .update({ pay_status: "paid" })
        .eq("order_number", cpm_trans_id);
    } else {
      await supa.from("orders")
        .update({ pay_status: "failed" })
        .eq("order_number", cpm_trans_id);
    }
    res.status(200).send("OK");
  } catch (err) {
    res.status(500).send("Error");
  }
});

module.exports = router;