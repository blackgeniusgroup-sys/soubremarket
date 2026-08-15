const express = require("express");
const router  = express.Router();
const prisma  = require("../services/prisma");
const supa    = require("../services/supabase");
const { requireAuth } = require("../middleware/auth");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Toutes les routes nécessitent une authentification
router.use(requireAuth);

/**
 * Helper : vérifie que l'utilisateur a accès à une conversation.
 * - Un vendeur ne peut lire QUE ses conversations (vendor_id = son ID)
 * - Un admin/superadmin a accès global (toutes les conversations)
 * - Les autres rôles (client, livreur) sont refusés
 */
async function canAccessConversation(userId, profileType, conversationId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  }).catch(() => null);

  if (!conversation) return { allowed: false, conversation: null };

  // Admins et superadmins ont accès global
  if (profileType === "admin" || profileType === "superadmin") {
    return { allowed: true, conversation };
  }

  // Vendeur : accès UNIQUEMENT à ses propres conversations
  if (profileType === "vendor") {
    if (conversation.vendorId !== userId) {
      return { allowed: false, conversation: null };
    }
    return { allowed: true, conversation };
  }

  return { allowed: false, conversation: null };
}

/* ═══════════════════════════════════════════════════════════
   GET /api/messages/conversations
   Liste les conversations de l'utilisateur connecté.
   - Vendeur : ses conversations (admin assigné)
   - Admin : toutes les conversations
   ═══════════════════════════════════════════════════════════ */
router.get("/conversations", async (req, res) => {
  try {
    let conversations;

    if (req.profile.type === "admin" || req.profile.type === "superadmin") {
      // Admin : toutes les conversations, avec les infos vendeurs
      conversations = await prisma.conversation.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      // Enrichir avec les noms des vendeurs via Supabase
      const vendorIds = [...new Set(conversations.map(c => c.vendorId))];
      let vendorMap = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supa
          .from("vendors")
          .select("user_id, name, shop_name, phone")
          .in("user_id", vendorIds);
        vendorMap = (vendors || []).reduce((acc, v) => {
          acc[v.user_id] = v;
          return acc;
        }, {});
      }

      conversations = conversations.map(c => ({
        ...c,
        vendor: vendorMap[c.vendorId] || null,
        unreadCount: 0, // calculé par message pour l'admin
      }));

      // Calculer les non-lus pour l'admin
      for (const conv of conversations) {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: req.user.id,
            isRead: false,
          },
        }).catch(() => 0);
        conv.unreadCount = unreadCount;
      }
    } else if (req.profile.type === "vendor") {
      // Vendeur : uniquement ses conversations
      conversations = await prisma.conversation.findMany({
        where: { vendorId: req.user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      // Enrichir avec les infos admins via Supabase
      const adminIds = [...new Set(conversations.map(c => c.adminId))];
      let adminMap = {};
      if (adminIds.length > 0) {
        const { data: admins } = await supa
          .from("admins")
          .select("user_id, name, phone")
          .in("user_id", adminIds);
        const { data: superadmins } = await supa
          .from("superadmins")
          .select("user_id, name, phone")
          .in("user_id", adminIds);
        adminMap = [...(admins || []), ...(superadmins || [])].reduce((acc, a) => {
          acc[a.user_id] = a;
          return acc;
        }, {});
      }

      conversations = conversations.map(c => ({
        ...c,
        admin: adminMap[c.adminId] || null,
      }));

      // Calculer les non-lus pour le vendeur
      for (const conv of conversations) {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: req.user.id,
            isRead: false,
          },
        }).catch(() => 0);
        conv.unreadCount = unreadCount;
      }
    } else {
      return res.status(403).json({ error: "Accès refusé — seuls les vendeurs et admins peuvent utiliser la messagerie" });
    }

    res.json({ conversations: conversations || [] });
  } catch (err) {
    console.error("Erreur liste conversations:", err);
    res.status(500).json({ error: "Erreur lors du chargement des conversations" });
  }
});

/* ═══════════════════════════════════════════════════════════
   GET /api/messages/:conversationId
   Récupère les messages d'une conversation spécifique (avec vérification d'accès)
   ═══════════════════════════════════════════════════════════ */
router.get("/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  if (!UUID_REGEX.test(conversationId || "")) {
    return res.status(400).json({ error: "ID de conversation invalide" });
  }

  try {
    const { allowed, conversation } = await canAccessConversation(
      req.user.id, req.profile.type, conversationId
    );
    if (!allowed || !conversation) {
      return res.status(403).json({ error: "Accès refusé à cette conversation" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    }).catch(() => []);

    res.json({
      conversation,
      messages: messages || [],
    });
  } catch (err) {
    console.error("Erreur récupération messages:", err);
    res.status(500).json({ error: "Erreur lors du chargement des messages" });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/messages/:conversationId/send
   Envoie un message dans une conversation existante
   ═══════════════════════════════════════════════════════════ */
router.post("/:conversationId/send", async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!UUID_REGEX.test(conversationId || "")) {
    return res.status(400).json({ error: "ID de conversation invalide" });
  }
  if (!content || typeof content !== "string" || content.trim().length < 1 || content.trim().length > 2000) {
    return res.status(400).json({ error: "Message requis (1-2000 caractères)" });
  }

  try {
    const { allowed, conversation } = await canAccessConversation(
      req.user.id, req.profile.type, conversationId
    );
    if (!allowed || !conversation) {
      return res.status(403).json({ error: "Accès refusé à cette conversation" });
    }

    // Déterminer le destinataire
    const receiverId = conversation.vendorId === req.user.id
      ? conversation.adminId
      : conversation.vendorId;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.id,
        receiverId,
        content: content.trim().slice(0, 2000),
        isRead: false,
      },
    }).catch(() => null);

    if (!message) {
      // Fallback Supabase si Prisma échoue
      const { data, error } = await supa.from("messages").insert({
        conversation_id: conversationId,
        sender_id: req.user.id,
        receiver_id: receiverId,
        content: content.trim().slice(0, 2000),
        is_read: false,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    // Mettre à jour le timestamp de la conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    res.status(201).json(message);
  } catch (err) {
    console.error("Erreur envoi message:", err);
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/messages/start
   Démarre une nouvelle conversation (vendeur → admin)
   ═══════════════════════════════════════════════════════════ */
router.post("/start", async (req, res) => {
  const { subject, firstMessage } = req.body;

  // Seuls les vendeurs peuvent démarrer une conversation
  if (req.profile.type !== "vendor") {
    return res.status(403).json({ error: "Seuls les vendeurs peuvent démarrer une conversation" });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length < 2 || subject.trim().length > 100) {
    return res.status(400).json({ error: "Sujet requis (2-100 caractères)" });
  }
  if (!firstMessage || typeof firstMessage !== "string" || firstMessage.trim().length < 1 || firstMessage.trim().length > 2000) {
    return res.status(400).json({ error: "Premier message requis (1-2000 caractères)" });
  }

  try {
    // Trouver un admin disponible (premier admin actif)
    const { data: adminProfile, error: adminError } = await supa
      .from("admins")
      .select("user_id")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    let adminId = adminProfile?.user_id || null;

    // Si aucun admin, chercher dans superadmins
    if (!adminId) {
      const { data: superAdminProfile } = await supa
        .from("superadmins")
        .select("user_id")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      adminId = superAdminProfile?.user_id || null;
    }

    if (!adminId) {
      return res.status(500).json({ error: "Aucun administrateur disponible pour le moment" });
    }

    // Vérifier si une conversation existe déjà entre ce vendeur et cet admin
    const existing = await prisma.conversation.findUnique({
      where: {
        vendorId_adminId: {
          vendorId: req.user.id,
          adminId,
        },
      },
    }).catch(() => null);

    if (existing) {
      // La conversation existe déjà, ajouter le premier message si fourni
      const message = await prisma.message.create({
        data: {
          conversationId: existing.id,
          senderId: req.user.id,
          receiverId: adminId,
          content: firstMessage.trim().slice(0, 2000),
          isRead: false,
        },
      }).catch(() => null);

      return res.status(200).json({
        conversation: existing,
        message,
        alreadyExists: true,
      });
    }

    // Créer la nouvelle conversation
    const conversation = await prisma.conversation.create({
      data: {
        vendorId: req.user.id,
        adminId,
        subject: subject.trim().slice(0, 100),
        status: "open",
      },
    }).catch(() => null);

    if (!conversation) {
      return res.status(500).json({ error: "Erreur lors de la création de la conversation" });
    }

    // Créer le premier message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.user.id,
        receiverId: adminId,
        content: firstMessage.trim().slice(0, 2000),
        isRead: false,
      },
    }).catch(() => null);

    res.status(201).json({ conversation, message });
  } catch (err) {
    console.error("Erreur démarrage conversation:", err);
    res.status(500).json({ error: "Erreur lors du démarrage de la conversation" });
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH /api/messages/:conversationId/read
   Marque tous les messages comme lus (pour l'utilisateur connecté)
   ═══════════════════════════════════════════════════════════ */
router.patch("/:conversationId/read", async (req, res) => {
  const { conversationId } = req.params;
  if (!UUID_REGEX.test(conversationId || "")) {
    return res.status(400).json({ error: "ID de conversation invalide" });
  }

  try {
    const { allowed } = await canAccessConversation(
      req.user.id, req.profile.type, conversationId
    );
    if (!allowed) {
      return res.status(403).json({ error: "Accès refusé à cette conversation" });
    }

    // Marquer tous les messages reçus par l'utilisateur comme lus
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    }).catch(() => ({ count: 0 }));

    // Fallback Supabase si Prisma échoue
    if (!result || result.count === undefined) {
      await supa.from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_id", req.user.id)
        .eq("is_read", false);
    }

    res.json({ success: true, updated: result?.count || 0 });
  } catch (err) {
    console.error("Erreur marquage lu:", err);
    res.status(500).json({ error: "Erreur lors du marquage des messages" });
  }
});

module.exports = router;