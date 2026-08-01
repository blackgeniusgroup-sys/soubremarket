const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes." }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Trop de tentatives de connexion." }
});

module.exports = { apiLimiter, authLimiter };