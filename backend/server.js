require("dotenv").config(); // Charge les variables d'environnement depuis le fichier .env
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const app       = express();
app.set("trust proxy", 1); // Pour Heroku et autres proxys

const { apiLimiter } = require("./middleware/rateLimit");

// Sécurité & middlewares
// Remplacez votre app.use(cors(...)) actuel par ce bloc dynamique
app.use(cors({
  origin: function (origin, callback) {
    // Si la requête vient d'un navigateur (origin existe)
    if (origin) {
      // On autorise toutes les extensions de votre projet (localhost ou vos domaines vercel)
      if (origin.startsWith('http://localhost') || origin.includes('vercel.app')) {
       return callback(null, true);
      }
    }
    // Autorise aussi les requêtes sans origine (comme Postman ou les outils serveurs)
    callback(null, true);
  },
  credentials: true
})); 
app.use(helmet());                    
app.use(express.json({ limit: "5mb" }));
app.use("/api/", apiLimiter);


// Routes
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders",   require("./routes/orders"));
app.use("/api/livreurs", require("./routes/livreurs"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/payments", require("./routes/payments"));

// GET /api/zones — public
const supa = require("./services/supabase");
app.get("/api/zones", async (req, res) => {
  const { data } = await supa.from("zones").select("*").eq("active",true).order("max_km");
  res.json({ zones: data });
});

// GET /api/map-lieux — public
app.get("/api/map-lieux", async (req, res) => {
  const { data } = await supa.from("map_lieux").select("*").eq("active",true).order("name");
  res.json({ lieux: data });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

// 404
app.use((req, res) => res.status(404).json({ error: "Route introuvable" }));

// Erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur interne" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ SoubreMarket API → http://localhost:${PORT}`));