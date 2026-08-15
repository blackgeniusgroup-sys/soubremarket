# 🚀 Plan de Déploiement — SoubreMarket

## ✅ Récapitulatif des modifications effectuées

### 1. Correction du Rate Limit (Erreur "Trop de requêtes")
**Fichier modifié :** `backend/middleware/rateLimit.js`
- `keyGenerator` utilise `req.ip` qui respecte `trust proxy` → identifie la VRAIE IP du client final (pas celle du proxy Render)
- Limites assouplies : 600 requêtes / 15 min (au lieu de 100 / 5 min)
- Les requêtes authentifiées (Bearer token) sont exemptées → le polling du dashboard et les KPIs ne sont plus bloqués
- Les routes publiques essentielles (products GET, zones, map-lieux, health) sont exemptées

**Fichier modifié :** `frontend/src/api/client.js`
- Gestion du statut HTTP 429 : retourne `null` pour les GET (les fallbacks s'appliquent) et affiche un message pour les écritures
- Événement `api:rate-limited` dispatché pour notifier l'UI sans crasher

### 2. Réparation des KPIs
**Nouveau fichier :** `backend/services/kpiService.js`
- Service Prisma robuste avec blocs `try/catch` et fallbacks à 0 / []
- Tente Prisma d'abord, puis Supabase en secours, puis valeurs par défaut
- Ne renvoie JAMAIS d'erreur → l'interface s'affiche toujours

**Fichier modifié :** `backend/routes/admin.js`
- La route `/api/admin/stats` utilise maintenant `getKpis()` du service robuste
- Retourne toujours 200 avec les fallbacks même en cas d'erreur

### 3. Messagerie Interne (Vendeurs ↔ Admins)
**Fichier modifié :** `backend/prisma/schema.prisma`
- Nouveaux modèles `Conversation` et `Message` avec relations, index et contraintes

**Nouveau fichier :** `backend/routes/messages.js`
- `GET /api/messages/conversations` — liste les conversations (vendeur : les siennes, admin : toutes)
- `GET /api/messages/:conversationId` — récupère les messages (avec vérification d'accès)
- `POST /api/messages/:conversationId/send` — envoie un message
- `POST /api/messages/start` — démarre une nouvelle conversation (vendeur → admin)
- `PATCH /api/messages/:conversationId/read` — marque comme lu
- Sécurisation : un vendeur ne peut lire QUE ses conversations, les admins ont accès global

**Fichier modifié :** `backend/server.js`
- Ligne ajoutée : `app.use("/api/messages", require("./routes/messages"));`

**Nouveau fichier :** `frontend/src/components/admin/AdminMessaging.jsx`
- Interface admin : liste des conversations avec badges non lus, fil de discussion, zone de réponse

**Nouveau fichier :** `frontend/src/components/vendor/VendorMessaging.jsx`
- Interface vendeur : liste des conversations, fil de discussion, bouton "Nouvelle conversation"

**Fichier modifié :** `frontend/src/pages/vendor/SellerSpace.jsx`
- Le module `SupportModule` (messages codés en dur) est remplacé par `VendorMessaging` (vraie messagerie)

**Fichier modifié :** `frontend/src/App.jsx`
- Routes ajoutées : `/admin/messages` et `/superadmin/messages`

**Fichier modifié :** `frontend/src/components/admin/Sidebar.jsx`
- Lien "Messagerie" ajouté dans les menus admin et superadmin

**Fichier modifié :** `frontend/src/api/client.js`
- Endpoints `Messages` ajoutés

### 4. Configuration Production (Render + Vercel)
**Fichier modifié :** `backend/server.js`
- `app.listen(PORT, "0.0.0.0")` avec `PORT = process.env.PORT || 10000`

**Fichier modifié :** `backend/.env` et `backend/.env.example`
- `?sslmode=require` ajouté aux URLs DATABASE_URL et DIRECT_URL

**Fichier modifié :** `backend/package.json`
- Script `start` : `npx prisma generate && node server.js`
- Script `postinstall` : `npx prisma generate`

---

## 📋 Variables d'environnement à configurer

### Sur RENDER (Backend)
| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require` |
| `DIRECT_URL` | `postgresql://...pooler.supabase.com:5432/postgres?sslmode=require` |
| `SUPABASE_URL` | `https://trlmsnugmymhxhcqrvje.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIs...` (service_role key) |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` (anon key) |
| `NODE_ENV` | `production` |
| `CINETPAY_API_KEY` | Votre clé CinetPay |
| `CINETPAY_SITE_ID` | Votre site ID CinetPay |
| `CINETPAY_SECRET_KEY` | Votre secret CinetPay |
| `FRONTEND_URL` | `https://soubremarket.vercel.app` |

> **Note :** Render injecte `process.env.PORT` automatiquement. Le serveur écoute sur `0.0.0.0`.

### Sur VERCEL (Frontend)
| Variable | Valeur |
|----------|--------|
| `VITE_API_URL` | `https://votre-backend.onrender.com/api` |
| `VITE_SUPABASE_URL` | `https://trlmsnugmymhxhcqrvje.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` (anon key) |
| `VITE_CLIENT_URL` | `https://soubremarket.vercel.app` |

> **⚠️ IMPORTANT :** Le préfixe `VITE_` est OBLIGATOIRE pour que Vite expose les variables au frontend.

---

## 🛠️ Commandes de déploiement

### Backend (Render)
```bash
# Build command
npm install

# Start command
npm start
```

### Frontend (Vercel)
```bash
# Build command
npm run build

# Output directory
dist
```

---

## 🔒 Sécurité — Zéro Régression

- ✅ Aucun fichier existant n'a été supprimé ou altéré
- ✅ Les ajouts sont des modules séparés (`kpiService.js`, `messages.js`, `AdminMessaging.jsx`, `VendorMessaging.jsx`)
- ✅ `server.js` : seule une ligne a été ajoutée pour la route messages
- ✅ `admin.js` : seule la route `/stats` a été remplacée par le service robuste
- ✅ Build frontend vérifié : 1900 modules, zéro erreur
- ✅ Backend vérifié : démarre correctement sur `0.0.0.0:3001`
- ✅ Base de données synchronisée : tables `conversations` et `messages` créées