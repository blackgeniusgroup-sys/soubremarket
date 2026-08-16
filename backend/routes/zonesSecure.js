/**
 * ═══════════════════════════════════════════════════════════════
 *  ROUTES ZONES SÉCURISÉES — CORRECTION 42501 / RLS
 * ═══════════════════════════════════════════════════════════════
 *  Problème original :
 *  - `POST /api/admin/zones` utilisait la clé service_role (via le
 *    client Supabase global `supabase.js`).
 *  - Avec la clé service_role, RLS est contourné — MAIS quand la clé
 *    est mal configurée, l'erreur 42501 apparaît : `auth.uid()`
 *    retourne NULL car aucun JWT utilisateur n'est injecté.
 *
 *  Solution sécurisée :
 *  - Ce routeur utilise `req.supabase` (clé ANON + JWT utilisateur)
 *  - `auth.uid()` retourne le VRAI ID → les politiques RLS
 *    `public.is_admin()` valident l'accès
 *  - ZÉRO utilisation de service_role pour les opérations RLS
 *
 *  ⚠️ SÉCURITÉ — ID-SPOOFING :
 *  - L'ID utilisateur vient UNIQUEMENT du JWT validé par `requireAuth`
 *  - Le body ne peut pas forcer un autre user_id
 * ═══════════════════════════════════════════════════════════════
 */
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const attachSupabase = require("../middleware/attachSupabase");

// Toutes les routes nécessitent un admin authentifié + client Supabase JWT
router.use(requireAuth, requireRole("admin", "superadmin"), attachSupabase);

// GET /api/zones-secure — liste toutes les zones (admin)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from("zones")
      .select("*")
      .order("name");

    if (error) {
      console.error("Erreur RLS zones GET:", error.message);
      return res.status(error.code === "42501" ? 403 : 500).json({
        error: error.code === "42501"
          ? "Accès refusé par RLS — vérifiez les politiques zones"
          : "Erreur lors du chargement des zones"
      });
    }

    res.json({ zones: data || [] });
  } catch (err) {
    console.error("Erreur zones:", err);
    res.status(500).json({ error: "Erreur lors du chargement des zones" });
  }
});

// POST /api/zones-secure — Ajouter une zone (corrige l'erreur 42501)
router.post("/", async (req, res) => {
  const { name, max_km, price } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nom de zone requis (min 2 caractères)" });
  }
  const km = Number(max_km);
  const p = Number(price);
  if (!Number.isFinite(km) || km < 0) return res.status(400).json({ error: "max_km invalide" });
  if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: "price invalide" });

  try {
    const { data, error } = await req.supabase
      .from("zones")
      .insert({
        name: name.trim().slice(0, 100),
        max_km: km,
        price: p,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("ERREUR RLS INSERT zone:", error);
      // 42501 = violation RLS → message clair pour l'administrateur
      if (error.code === "42501") {
        return res.status(403).json({
          error: "Politique RLS bloquée — exécutez le script backend/prisma/rls_policies.sql dans le SQL Editor Supabase"
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Erreur création zone:", err);
    res.status(500).json({ error: err.message || "Erreur lors de la création de la zone" });
  }
});

// PATCH /api/zones-secure/:id — Modifier une zone
router.patch("/:id", async (req, res) => {
  const zoneId = Number(req.params.id);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ error: "ID de zone invalide" });
  }

  const updates = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length < 2) {
      return res.status(400).json({ error: "Nom de zone invalide" });
    }
    updates.name = req.body.name.trim().slice(0, 100);
  }
  if (req.body.max_km !== undefined) {
    const km = Number(req.body.max_km);
    if (!Number.isFinite(km) || km < 0) return res.status(400).json({ error: "max_km invalide" });
    updates.max_km = km;
  }
  if (req.body.price !== undefined) {
    const p = Number(req.body.price);
    if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: "price invalide" });
    updates.price = p;
  }
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== "boolean") return res.status(400).json({ error: "active doit être booléen" });
    updates.active = req.body.active;
  }

  try {
    const { data, error } = await req.supabase
      .from("zones")
      .update(updates)
      .eq("id", zoneId)
      .select()
      .single();

    if (error) {
      if (error.code === "42501") {
        return res.status(403).json({ error: "Politique RLS refusée — vérifiez les politiques RLS zones" });
      }
      if (error.code === "PGRST116") return res.status(404).json({ error: "Zone introuvable" });
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Erreur modification zone:", err);
    res.status(500).json({ error: "Erreur lors de la modification de la zone" });
  }
});

// DELETE /api/zones-secure/:id — Supprimer une zone
router.delete("/:id", async (req, res) => {
  const zoneId = Number(req.params.id);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ error: "ID de zone invalide" });
  }

  try {
    const { data, error } = await req.supabase
      .from("zones")
      .delete()
      .eq("id", zoneId)
      .select()
      .single();

    if (error) {
      if (error.code === "42501") {
        return res.status(403).json({ error: "Politique RLS refusée — vérifiez les politiques RLS zones" });
      }
      if (error.code === "PGRST116") return res.status(404).json({ error: "Zone introuvable" });
      throw error;
    }

    res.json({ message: "Zone supprimée" });
  } catch (err) {
    console.error("Erreur suppression zone:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de la zone" });
  }
});

module.exports = router;