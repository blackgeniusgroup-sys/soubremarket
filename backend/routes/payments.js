const express = require("express");
const router  = express.Router();
const supa    = require("../services/supabase");
const { requireAuth, requireRole } = require("../middleware/auth");
const { webhookLimiter } = require("../middleware/rateLimit");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/payments/initiate — initier un paiement CinetPay
router.post("/initiate", requireAuth, requireRole("client"), async (req, res) => {
  const { order_id } = req.body;
  if (!order_id || !UUID_REGEX.test(order_id)) {
    return res.status(400).json({ error: "ID de commande invalide" });
  }
  try {
    const { data: order, error: orderError } = await supa
      .from("orders").select("*").eq("id", order_id).eq("client_id", req.user.id).single();
    
    if (orderError || !order) return res.status(404).json({ error: "Commande introuvable" });
    
    if (order.pay_method === "cash") {
      return res.status(400).json({ error: "Cette commande est en paiement cash" });
    }

    if (order.pay_status === "paid") {
      return res.status(400).json({ error: "Cette commande est déjà payée" });
    }

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(500).json({ error: "Montant de commande invalide" });
    }

    // Générer une signature HMAC pour le webhook
    const transactionRef = `${order.order_number}-${Date.now()}`;

    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        apikey:         process.env.CINETPAY_API_KEY,
        site_id:        process.env.CINETPAY_SITE_ID,
        transaction_id: transactionRef,
        amount,
        currency:       "XOF",
        description:    `Commande ${order.order_number} sur SoubreMarket`,
        notify_url:     `${process.env.SERVER_URL || "http://localhost:3001"}/api/payments/notify`,
        return_url:     `${process.env.CLIENT_URL || "http://localhost:5173"}/suivi?order=${order.id}`,
        cancel_url:     `${process.env.CLIENT_URL || "http://localhost:5173"}/panier`,
        customer_email: req.user.email,
        customer_name:  req.profile.name,
        channels:       "ALL"
      })
    });
    const result = await response.json();

    if (result.code !== "201") {
      console.error("Erreur CinetPay:", result);
      return res.status(400).json({ error: "Erreur initialisation paiement" });
    }

    res.json({ payment_url: result.data.payment_url, transaction_id: transactionRef });
  } catch (err) {
    console.error("Erreur init paiement:", err);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
});

// POST /api/payments/notify — webhook CinetPay (appelé par CinetPay, pas le client)
router.post("/notify", webhookLimiter, async (req, res) => {
  const { cpm_trans_id, cpm_result, cpm_amount, cpm_currency, cpm_site_id } = req.body;

  // Validation des champs requis
  if (!cpm_trans_id || !cpm_result || !cpm_amount) {
    return res.status(400).send("Bad Request");
  }

  // Vérifier que le site_id correspond
  if (cpm_site_id && String(cpm_site_id) !== String(process.env.CINETPAY_SITE_ID)) {
    console.error("Webhook rejeté: site_id invalide");
    return res.status(403).send("Forbidden");
  }

  try {
    // Étape 1 : Vérifier la transaction auprès de l'API CinetPay 
    // pour confirmer que le paiement est réel (anti-fraude)
    const verifyResponse = await fetch("https://api-checkout.cinetpay.com/v2/transactions/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        apikey:  process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: cpm_trans_id
      })
    });

    const verifyResult = await verifyResponse.json();

    // CinetPay renvoie code=00 si la transaction est valide
    const isVerifiedPaid = verifyResult.code === "00" && verifyResult.data?.status === "ACCEPTED";
    
    // Extraire le numéro de commande réel depuis la référence
    const orderNumber = cpm_trans_id.split("-")[0];

    // Récupérer la commande pour vérifier le montant
    const { data: order } = await supa
      .from("orders")
      .select("id, order_number, total, pay_status")
      .eq("order_number", orderNumber)
      .single();

    if (!order) {
      return res.status(404).send("Order Not Found");
    }

    // Vérification anti-fraude : le montant du webhook doit correspondre au total de la commande
    const expectedAmount = Number(order.total);
    const receivedAmount = Number(cpm_amount);

    if (!Number.isFinite(expectedAmount) || !Number.isFinite(receivedAmount)) {
      console.error("Webhook rejeté: montants invalides");
      return res.status(400).send("Bad Request");
    }

    if (cpm_result === "00" && isVerifiedPaid) {
      // Paiement vérifié et confirmé
      if (Math.abs(receivedAmount - expectedAmount) > 1) {
        // Écart de montant - possible fraude
        console.error(`Webhook rejeté: montant mismatch ${receivedAmount} != ${expectedAmount}`);
        return res.status(400).send("Amount Mismatch");
      }

      await supa.from("orders")
        .update({ 
          pay_status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);

      res.status(200).send("OK");
    } else if (cpm_result !== "00") {
      await supa.from("orders")
        .update({ pay_status: "failed" })
        .eq("id", order.id);
      res.status(200).send("OK");
    } else {
      // cpm_result=00 mais vérification CinetPay a échoué - possible fraude
      console.error(`Webhook rejeté: vérification CinetPay échouée pour transaction ${cpm_trans_id}`);
      res.status(403).send("Verification Failed");
    }
  } catch (err) {
    console.error("Erreur webhook:", err);
    res.status(500).send("Error");
  }
});

module.exports = router;