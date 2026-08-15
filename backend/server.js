require("dotenv").config(); // Charge les variables d'environnement depuis le fichier .env
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const app       = express();
app.set("trust proxy", 1); // Pour Heroku et autres proxys

const { apiLimiter } = require("./middleware/rateLimit");

// Liste blanche des origines autorisées
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://soubremarket.vercel.app",
  "https://soubremarket-git-main.vercel.app",
  "https://soubremarket-git-dev.vercel.app"
];

// Sécurité & middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origine (Postman, outils serveurs, webhooks)
    if (!origin) return callback(null, true);
    // Vérifie si l'origine est dans la liste blanche
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Vérifie les sous-domaines vercel.app
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(new Error("Origine non autorisée par CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api-checkout.cinetpay.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: "10mb" })); // Limite la taille du corps à 10 Mo (pour les uploads d'images base64)
app.use("/api/", apiLimiter);

app.use((req, res, next) => {
  // On nettoie les doubles slashs n'importe où dans l'URL (sauf après le http:)
  if (req.url.includes('//')) {
    req.url = req.url.replace(/([^:]\/)\/+/g, "$1");
  }
  next();
});

// Routes
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders",   require("./routes/orders"));
app.use("/api/livreurs", require("./routes/livreurs"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/vendor",   require("./routes/vendor"));
app.use("/api/messages", require("./routes/messages")); // ← AJOUT : Messagerie interne vendeurs ↔ admins

// GET /api/zones — public
const supa = require("./services/supabase");
app.get("/api/zones", async (req, res) => {
  try {
    const { data, error } = await supa.from("zones").select("*").eq("active",true).order("max_km");
    if (error) throw error;
    res.json({ zones: data });
  } catch (err) {
    console.error("Erreur zones:", err);
    res.status(500).json({ error: "Erreur lors du chargement des zones" });
  }
});

// GET /api/map-lieux — public
app.get("/api/map-lieux", async (req, res) => {
  try {
    const { data, error } = await supa.from("map_lieux").select("*").eq("active",true).order("name");
    if (error) throw error;
    res.json({ lieux: data });
  } catch (err) {
    console.error("Erreur map-lieux:", err);
    res.status(500).json({ error: "Erreur lors du chargement des lieux" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

// 404
app.use((req, res) => res.status(404).json({ error: "Route introuvable" }));

// Erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Ne pas exposer les détails internes en production
  const message = process.env.NODE_ENV === "production"
    ? "Erreur serveur interne"
    : err.message;
  res.status(500).json({ error: message });
});

// ═══════════════════════════════════════════════════════════
//  CONFIGURATION RENDER — PORT dynamique + hôte 0.0.0.0
//  Render injecte process.env.PORT automatiquement.
//  L'hôte 0.0.0.0 est OBLIGATOIRE pour que Render puisse
//  router les requêtes vers le process Node.js.
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ SoubreMarket API → http://0.0.0.0:${PORT}`));
