-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── NETTOYAGE (si re-run) ───────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP TRIGGER IF EXISTS products_updated_at ON products;
DROP FUNCTION IF EXISTS update_updated_at();
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
DROP TRIGGER IF EXISTS on_order_item_created ON order_items;
DROP FUNCTION IF EXISTS decrement_stock();
DROP TRIGGER IF EXISTS on_comment_approved ON comments;
DROP FUNCTION IF EXISTS update_product_rating();
DROP TRIGGER IF EXISTS on_order_status_change ON orders;
DROP FUNCTION IF EXISTS notify_order_status_change();

DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS comments         CASCADE;
DROP TABLE IF EXISTS order_items      CASCADE;
DROP TABLE IF EXISTS orders           CASCADE;
DROP TABLE IF EXISTS products         CASCADE;
DROP TABLE IF EXISTS livreurs         CASCADE;
DROP TABLE IF EXISTS vendors          CASCADE;
DROP TABLE IF EXISTS clients         CASCADE;
DROP TABLE IF EXISTS admins          CASCADE;
DROP TABLE IF EXISTS superadmins     CASCADE;
DROP TABLE IF EXISTS zones            CASCADE;
DROP TABLE IF EXISTS settings         CASCADE;
DROP TABLE IF EXISTS map_lieux        CASCADE;

-- ─── ROLE TABLES (extension de auth.users) ──────────────────────
CREATE TABLE superadmins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  address    TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendors (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  shop_name  TEXT,
  whatsapp   TEXT,
  address    TEXT,
  active     BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE livreurs (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  active           BOOLEAN DEFAULT FALSE,
  vehicule         TEXT,
  zone_travail     TEXT,
  photo_url        TEXT,
  permis           TEXT DEFAULT 'non' CHECK (permis IN ('oui','non')),
  permis_recto_url TEXT,
  permis_verso_url TEXT,
  cni_url          TEXT,
  current_lat      NUMERIC(10,7),
  current_lng      NUMERIC(10,7),
  is_online        BOOLEAN DEFAULT FALSE,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : crée automatiquement un profil client à l'inscription si le type est client
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type TEXT;
BEGIN
  user_type := COALESCE(NEW.raw_user_meta_data->>'type', 'client');
  IF user_type = 'client' THEN
    INSERT INTO clients (user_id, name, phone, active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'phone',
      TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── ZONES ───────────────────────────────────────────────────
CREATE TABLE zones (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  max_km   INTEGER NOT NULL,
  price    INTEGER NOT NULL,
  active   BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO zones (name, max_km, price) VALUES
  ('Centre-ville',  2,   500),
  ('Quartier Nord', 5,  1000),
  ('Quartier Sud',  10, 1500),
  ('Périphérie',    20, 2500),
  ('Zone rurale',   40, 4000);

-- ─── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id    UUID NOT NULL REFERENCES vendors(user_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        INTEGER NOT NULL CHECK (price > 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category     TEXT NOT NULL,
  emoji        TEXT DEFAULT '📦',
  image_url    TEXT,
  featured     BOOLEAN DEFAULT FALSE,
  active       BOOLEAN DEFAULT TRUE,
  rating       NUMERIC(3,1) DEFAULT 0,
  total_sales  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ORDERS ──────────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT UNIQUE NOT NULL DEFAULT 'CMD-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
  client_id       UUID NOT NULL REFERENCES clients(user_id),
  vendor_id       UUID NOT NULL REFERENCES vendors(user_id),
  livreur_id      UUID REFERENCES livreurs(user_id),
  zone_id         INTEGER REFERENCES zones(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','assigned','picked','delivering','delivered','cancelled')),
  pay_method      TEXT NOT NULL DEFAULT 'cash' CHECK (pay_method IN ('cash','wave','orange_money')),
  pay_status      TEXT NOT NULL DEFAULT 'pending' CHECK (pay_status IN ('pending','paid','failed')),
  subtotal        INTEGER NOT NULL DEFAULT 0,
  commission      INTEGER NOT NULL DEFAULT 0,
  delivery_fee    INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  delivery_addr   TEXT NOT NULL,
  delivery_lat    NUMERIC(10,7),
  delivery_lng    NUMERIC(10,7),
  vendor_addr     TEXT,
  notes           TEXT,
  cancelled_reason TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL,
  emoji       TEXT,
  qty         INTEGER NOT NULL CHECK (qty > 0),
  subtotal    INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: décrémente le stock automatiquement
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = stock - NEW.qty,
      total_sales = total_sales + NEW.qty
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_item_created
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION decrement_stock();

-- ─── COMMENTS ─────────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  user_name   TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT NOT NULL,
  approved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: recalcule la note moyenne du produit
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (
    SELECT ROUND(AVG(rating)::NUMERIC, 1)
    FROM comments
    WHERE product_id = NEW.product_id AND approved = TRUE
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_approved
  AFTER UPDATE ON comments
  FOR EACH ROW
  WHEN (NEW.approved = TRUE AND OLD.approved = FALSE)
  EXECUTE FUNCTION update_product_rating();

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('order','delivery','comment','livreur','payment','system','success')),
  read        BOOLEAN DEFAULT FALSE,
  data        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MAP LIEUX ─────────────────────────────────────────────
CREATE TABLE map_lieux (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'shop'
                CHECK (type IN ('market','pharmacy','farm','shop','admin','school','church','hotel')),
  note        TEXT,
  address     TEXT,
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  pos_x       INTEGER,
  pos_y       INTEGER,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO map_lieux (name, type, note, pos_x, pos_y) VALUES
  ('Marché Central',  'market',   'Ouvert 6h-18h',           48, 50),
  ('Pharmacie Koné',  'pharmacy', '24h/24',                  62, 32),
  ('Ferme Adjoua',    'farm',     'Route Daloa km 3',        72, 65),
  ('École Primaire',  'school',   'Quartier Sud',            35, 62),
  ('Mairie de Soubré','admin',    'Lun-Ven 8h-16h',          52, 38);

-- ─── SETTINGS ───────────────────────────────────────────────
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
  ('platform_name',    'SoubreMarket',                                    'Nom de la plateforme'),
  ('slogan',           'Achetez sans quitter le confort de votre maison.', 'Slogan affiché'),
  ('commission_rate',  '10',                                               'Taux de commission en %'),
  ('theme',            'green',                                            'Thème de couleur'),
  ('city',             'Soubré, Côte d''Ivoire',                           'Ville/province'),
  ('support_phone',    '+225 07 00 00 00 00',                              'Téléphone support'),
  ('min_order',        '500',                                              'Commande minimum en F CFA'),
  ('delivery_enabled', 'true',                                             'Livraisons activées');

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────
ALTER TABLE superadmins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE livreurs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_lieux     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings      ENABLE ROW LEVEL SECURITY;

-- PROFILES / ROLE POLICY
CREATE POLICY "Lecture clients"   ON clients FOR SELECT USING (TRUE);
CREATE POLICY "Mise à jour son profil client" ON clients FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Lecture vendors"   ON vendors FOR SELECT USING (TRUE);
CREATE POLICY "Mise à jour son profil vendeur" ON vendors FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Lecture livreurs"   ON livreurs FOR SELECT USING (status = 'approved');
CREATE POLICY "Livreur voit son profil" ON livreurs FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Lecture admins"   ON admins FOR SELECT USING (TRUE);
CREATE POLICY "Lecture superadmins" ON superadmins FOR SELECT USING (TRUE);

-- PRODUCTS (lecture publique, écriture vendeur)
CREATE POLICY "Lecture produits"        ON products FOR SELECT USING (active = TRUE);
CREATE POLICY "Vendeur gère ses produits" ON products FOR ALL
  USING (vendor_id = auth.uid());

-- ORDERS (client voit ses commandes, vendeur voit les siennes, livreur voit les siennes)
CREATE POLICY "Client voit ses commandes"   ON orders FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Vendeur voit ses commandes"  ON orders FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "Livreur voit ses commandes"  ON orders FOR SELECT USING (livreur_id = auth.uid());
CREATE POLICY "Client crée une commande"    ON orders FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Livreur met à jour statut"   ON orders FOR UPDATE
  USING (livreur_id = auth.uid());

-- COMMENTS
CREATE POLICY "Lecture commentaires approuvés" ON comments FOR SELECT USING (approved = TRUE);
CREATE POLICY "Client publie un avis"          ON comments FOR INSERT WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS (utilisateur voit les siennes uniquement)
CREATE POLICY "Mes notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Marquer comme lu"  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- MAP LIEUX, ZONES, SETTINGS (lecture publique)
CREATE POLICY "Lecture carte"     ON map_lieux FOR SELECT USING (active = TRUE);
CREATE POLICY "Lecture zones"     ON zones     FOR SELECT USING (active = TRUE);
CREATE POLICY "Lecture settings"  ON settings  FOR SELECT USING (TRUE);

-- ─── REALTIME ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE livreurs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── FONCTIONS UTILITAIRES ───────────────────────────────────
CREATE OR REPLACE FUNCTION get_delivery_fee(distance_km NUMERIC)
RETURNS INTEGER AS $$
DECLARE fee INTEGER;
BEGIN
  SELECT price INTO fee FROM zones
  WHERE max_km >= distance_km
  ORDER BY max_km ASC LIMIT 1;
  RETURN COALESCE(fee, 4000);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title   TEXT,
  p_message TEXT,
  p_type    TEXT DEFAULT 'info',
  p_data    JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (p_user_id, p_title, p_message, p_type, p_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  msg TEXT;
  notif_type TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'assigned'   THEN msg = 'Un livreur a été assigné à votre commande ' || NEW.order_number;    notif_type = 'delivery';
    WHEN 'picked'     THEN msg = 'Vos articles ont été récupérés — commande ' || NEW.order_number;     notif_type = 'delivery';
    WHEN 'delivering' THEN msg = 'Votre livreur est en route ! Commande ' || NEW.order_number;         notif_type = 'delivery';
    WHEN 'delivered'  THEN msg = '🎉 Commande ' || NEW.order_number || ' livrée avec succès !';        notif_type = 'success';
    WHEN 'cancelled'  THEN msg = 'Commande ' || NEW.order_number || ' annulée.';                       notif_type = 'system';
    ELSE RETURN NEW;
  END CASE;

  PERFORM create_notification(NEW.client_id, 'Mise à jour commande', msg, notif_type,
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number));

  IF NEW.status = 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();

-- ─── VUES UTILES ───────────────────────────────────────────────
CREATE VIEW orders_full AS
SELECT
  o.*,
  c.name         AS client_name,
  c.phone        AS client_phone,
  v.shop_name    AS vendor_name,
  v.address      AS vendor_address,
  l.name         AS livreur_name,
  l.phone        AS livreur_phone,
  l.status       AS livreur_status,
  l.user_id      AS livreur_user_id,
  z.name         AS zone_name
FROM orders o
JOIN clients c   ON c.user_id = o.client_id
JOIN vendors v   ON v.user_id = o.vendor_id
LEFT JOIN livreurs l ON l.user_id = o.livreur_id
LEFT JOIN zones z     ON z.id = o.zone_id;

CREATE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM clients)              AS total_clients,
  (SELECT COUNT(*) FROM vendors)              AS total_vendors,
  (SELECT COUNT(*) FROM livreurs WHERE status = 'approved')          AS total_livreurs,
  (SELECT COUNT(*) FROM livreurs WHERE status = 'pending')           AS pending_livreurs,
  (SELECT COUNT(*) FROM orders)                                       AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'delivering')          AS active_deliveries,
  (SELECT COALESCE(SUM(commission), 0) FROM orders WHERE status = 'delivered') AS total_commission,
  (SELECT COUNT(*) FROM comments WHERE approved = FALSE)             AS pending_comments,
  (SELECT COUNT(*) FROM products WHERE active = TRUE)                AS total_products;

-- Données de test optionnelles : insérer des users via auth, puis créer les rôles correspondants.
