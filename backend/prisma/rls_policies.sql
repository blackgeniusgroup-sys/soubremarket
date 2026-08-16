-- ═══════════════════════════════════════════════════════════════
--  SCRIPTS RLS CORRECTIFS — SoubreMarket
--  À EXÉCUTER DANS LE SQL EDITOR DE SUPABASE
--  Ces politiques corrigent l'erreur 42501 et sécurisent
--  toutes les lectures pour les pages de la sidebar.
--
--  ⚠️ PRINCIPE DE SÉCURITÉ :
--  - `auth.uid()` = ID de l'utilisateur authentifié (JWT)
--  - `auth.jwt() ->> 'role'` = rôle JWT (authenticated / service_role)
--  - Les politiques vérifient TOUJOURS l'identité via auth.uid()
--    et les tables de profils (admins, superadmins, vendors...)
--  - Aucune politique ne fait confiance à un ID envoyé par le client
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- 0. FONCTIONS UTILITAIRES (optionnel mais recommandé)
--    Vérifie si l'utilisateur connecté est admin ou superadmin
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND active = TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid() AND active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid() AND active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors WHERE user_id = auth.uid() AND active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ───────────────────────────────────────────────
-- 1. ZONES — Correction de l'erreur 42501
--    Un Admin/Superadmin peut insérer, modifier et supprimer.
--    Le public peut lire les zones actives.
--    Les admins peuvent lire TOUTES les zones (y compris inactives).
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins insèrent les zones" ON zones;
CREATE POLICY "Admins insèrent les zones" ON zones
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins modifient les zones" ON zones;
CREATE POLICY "Admins modifient les zones" ON zones
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins suppriment les zones" ON zones;
CREATE POLICY "Admins suppriment les zones" ON zones
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Lecture publique des zones actives
DROP POLICY IF EXISTS "Lecture zones" ON zones;
CREATE POLICY "Lecture zones" ON zones
  FOR SELECT
  USING (active = TRUE OR public.is_admin());

-- ───────────────────────────────────────────────
-- 2. PROFILS — Lectures légitimes pour la sidebar
--    Les admins peuvent lire TOUS les profils.
--    Les utilisateurs peuvent lire leur propre profil.
-- ───────────────────────────────────────────────

-- CLIENTS
DROP POLICY IF EXISTS "Lecture clients" ON clients;
CREATE POLICY "Lecture clients" ON clients
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- VENDORS
DROP POLICY IF EXISTS "Lecture vendors" ON vendors;
CREATE POLICY "Lecture vendors" ON vendors
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- LIVREURS (public voit les approuvés; admins voient tout; livreur voit son profil)
DROP POLICY IF EXISTS "Lecture livreurs" ON livreurs;
CREATE POLICY "Lecture livreurs" ON livreurs
  FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- ADMINS
DROP POLICY IF EXISTS "Lecture admins" ON admins;
CREATE POLICY "Lecture admins" ON admins
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_superadmin()
  );

-- SUPERADMINS
DROP POLICY IF EXISTS "Lecture superadmins" ON superadmins;
CREATE POLICY "Lecture superadmins" ON superadmins
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_superadmin()
  );

-- ───────────────────────────────────────────────
-- 3. ORDERS — Lectures pour les pages commandes
--    Chaque rôle ne voit QUE ses commandes.
--    Les admins voient TOUTES les commandes.
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Client voit ses commandes" ON orders;
CREATE POLICY "Client voit ses commandes" ON orders
  FOR SELECT
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Vendeur voit ses commandes" ON orders;
CREATE POLICY "Vendeur voit ses commandes" ON orders
  FOR SELECT
  USING (vendor_id = auth.uid());

DROP POLICY IF EXISTS "Livreur voit ses commandes" ON orders;
CREATE POLICY "Livreur voit ses commandes" ON orders
  FOR SELECT
  USING (livreur_id = auth.uid());

-- Les admins voient TOUTES les commandes (sidebar Commandes)
DROP POLICY IF EXISTS "Admins voient toutes les commandes" ON orders;
CREATE POLICY "Admins voient toutes les commandes" ON orders
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Client crée une commande" ON orders;
CREATE POLICY "Client crée une commande" ON orders
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- ORDER_ITEMS — Les admins voient tous les items, les participants voient les leurs
DROP POLICY IF EXISTS "Lecture order_items" ON order_items;
CREATE POLICY "Lecture order_items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid() OR o.livreur_id = auth.uid())
    )
    OR public.is_admin()
  );

-- ───────────────────────────────────────────────
-- 4. PRODUCTS — Lectures admin + vendeur + public
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Lecture produits" ON products;
CREATE POLICY "Lecture produits" ON products
  FOR SELECT
  USING (
    active = TRUE
    OR vendor_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Vendeur gère ses produits" ON products;
CREATE POLICY "Vendeur gère ses produits" ON products
  FOR ALL
  USING (vendor_id = auth.uid());

-- Admins peuvent gérer TOUS les produits (modération)
DROP POLICY IF EXISTS "Admins gèrent tous les produits" ON products;
CREATE POLICY "Admins gèrent tous les produits" ON products
  FOR ALL
  USING (public.is_admin());

-- ───────────────────────────────────────────────
-- 5. NOTIFICATIONS — Lectures + écritures
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Mes notifications" ON notifications;
CREATE POLICY "Mes notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Marquer comme lu" ON notifications;
CREATE POLICY "Marquer comme lu" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins voient toutes les notifications" ON notifications;
CREATE POLICY "Admins voient toutes les notifications" ON notifications
  FOR SELECT
  USING (public.is_admin());

-- Vendeur peut créer des notifications (API)
DROP POLICY IF EXISTS "Vendeur crée une notification" ON notifications;
CREATE POLICY "Vendeur crée une notification" ON notifications
  FOR INSERT
  WITH CHECK (public.is_vendor());

-- ───────────────────────────────────────────────
-- 6. MAP LIEUX — Admin gère, public lit
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Lecture carte" ON map_lieux;
CREATE POLICY "Lecture carte" ON map_lieux
  FOR SELECT
  USING (active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins gèrent les lieux" ON map_lieux;
CREATE POLICY "Admins gèrent les lieux" ON map_lieux
  FOR ALL
  USING (public.is_admin());

-- ───────────────────────────────────────────────
-- 7. SETTINGS — Lecture publique, écriture admin
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Lecture settings" ON settings;
CREATE POLICY "Lecture settings" ON settings
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins modifient les settings" ON settings;
CREATE POLICY "Admins modifient les settings" ON settings
  FOR ALL
  USING (public.is_admin());

-- ───────────────────────────────────────────────
-- 8. COMMENTS — Lecture approuvés + admin modère
-- ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Lecture commentaires approuvés" ON comments;
CREATE POLICY "Lecture commentaires approuvés" ON comments
  FOR SELECT
  USING (
    approved = TRUE
    OR user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Client publie un avis" ON comments;
CREATE POLICY "Client publie un avis" ON comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins modèrent
DROP POLICY IF EXISTS "Admins modèrent les commentaires" ON comments;
CREATE POLICY "Admins modèrent les commentaires" ON comments
  FOR ALL
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 9. MESSAGERIE — RLS pour conversations & messages
--    Seul l'émetteur OU le récepteur peut lire/écrire
--    Un vendeur ne voit QUE ses conversations avec les admins
--    Un admin voit toutes les conversations
-- ═══════════════════════════════════════════════════════════════

-- CONVERSATIONS
-- Un vendeur ne voit QUE ses conversations (vendor_id = lui)
DROP POLICY IF EXISTS "Vendeur lit ses conversations" ON conversations;
CREATE POLICY "Vendeur lit ses conversations" ON conversations
  FOR SELECT
  USING (vendor_id = auth.uid());

-- Un admin voit toutes les conversations (il est admin_id ou superadmin)
DROP POLICY IF EXISTS "Admin lit ses conversations" ON conversations;
CREATE POLICY "Admin lit ses conversations" ON conversations
  FOR SELECT
  USING (
    admin_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Vendeur crée une conversation" ON conversations;
CREATE POLICY "Vendeur crée une conversation" ON conversations
  FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

DROP POLICY IF EXISTS "Admin crée une conversation" ON conversations;
CREATE POLICY "Admin crée une conversation" ON conversations
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Participants modifient la conversation" ON conversations;
CREATE POLICY "Participants modifient la conversation" ON conversations
  FOR UPDATE
  USING (
    vendor_id = auth.uid()
    OR admin_id = auth.uid()
    OR public.is_admin()
  );

-- MESSAGES
-- Seul l'émetteur ou le récepteur peut lire un message
DROP POLICY IF EXISTS "Lecture messages participants" ON messages;
CREATE POLICY "Lecture messages participants" ON messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR public.is_admin()
  );

-- Seul l'émetteur peut insérer un message
DROP POLICY IF EXISTS "Insertion messages émetteur" ON messages;
CREATE POLICY "Insertion messages émetteur" ON messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Le récepteur peut marquer comme lu
DROP POLICY IF EXISTS "Récepteur marque comme lu" ON messages;
CREATE POLICY "Récepteur marque comme lu" ON messages
  FOR UPDATE
  USING (receiver_id = auth.uid());

-- ───────────────────────────────────────────────
-- NETTOYAGE FINAL : active RLS partout
-- ───────────────────────────────────────────────
ALTER TABLE zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE livreurs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_lieux      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;