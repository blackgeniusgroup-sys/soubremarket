/**
 * ═══════════════════════════════════════════════════════════════
 *  CLIENT API — SÉCURISÉ AVEC INTERCEPTEUR GLOBAL
 * ═══════════════════════════════════════════════════════════════
 *  Utilise l'intercepteur `apiFetch` qui :
 *  1. Injecte automatiquement le Bearer Token Supabase
 *  2. Rafraîchit automatiquement le token expiré
 *  3. Rejoue la requête après refresh (aucune page vide)
 *  4. Gère proprement les erreurs 429 (rate limit)
 * ═══════════════════════════════════════════════════════════════
 */
import apiFetch, { tokenStore } from "./interceptor";

class ApiClient {
  constructor() {
    this.tokenKey = "soubremarket_token";
    this.refreshKey = "soubremarket_refresh_token";
  }

  getToken() {
    return tokenStore.getToken();
  }

  getRefreshToken() {
    return tokenStore.getRefreshToken();
  }

  setTokens(accessToken, refreshToken) {
    tokenStore.setTokens(accessToken, refreshToken);
  }

  removeTokens() {
    tokenStore.removeTokens();
  }

  async request(endpoint, options = {}) {
    return apiFetch(endpoint, options);
  }

  get(url, params)      { return this.request(url + (params ? "?" + new URLSearchParams(params) : ""), { method: "GET" }); }
  post(url, body)       { return this.request(url, { method: "POST",   body: JSON.stringify(body) }); }
  patch(url, body)      { return this.request(url, { method: "PATCH",  body: JSON.stringify(body) }); }
  delete(url)           { return this.request(url, { method: "DELETE" }); }

  // Nettoyage sécurisé des données
  sanitizeInput(value) {
    if (typeof value !== "string") return value;
    return value.replace(/[<>]/g, "").slice(0, 5000);
  }
}

export const api = new ApiClient();

// ─── API endpoints ───────────────────────────────────────────
export const Auth = {
  login:    (data)        => api.post("/auth/login", data),
  register: (data)        => api.post("/auth/register", data),
  logout:   ()            => api.post("/auth/logout"),
  me:       ()            => api.get("/auth/me"),
  upload:   (data)        => api.post("/auth/upload", data),
};

export const Products = {
  list:     (params)      => api.get("/products", params),
  get:      (id)          => api.get(`/products/${id}`),
  create:   (data)        => api.post("/products", data),
  update:   (id, data)    => api.patch(`/products/${id}`, data),
  comment:  (id, data)    => api.post(`/products/${id}/comments`, data),
};

export const Orders = {
  list:     (params)      => api.get("/orders", params),
  get:      (id)          => api.get(`/orders/${id}`),
  create:   (data)        => api.post("/orders", data),
  setStatus:(id, status)  => api.patch(`/orders/${id}/status`, { status }),
  assign:   (id, lid)     => api.patch(`/orders/${id}/assign`, { livreur_id: lid }),
};

export const Livreurs = {
  list:     (params)      => api.get("/livreurs", params),
  me:       ()            => api.get("/livreurs/me"),
  register: (data)        => api.post("/livreurs/register", data),
  setStatus:(id, status, note) => api.patch(`/livreurs/${id}/status`, { status, admin_note: note }),
  updatePos:(lat, lng)    => api.patch("/livreurs/location", { lat, lng }),
};

export const Admin = {
  stats:         ()          => api.get("/admin/stats"),
  drivers:       ()          => api.get("/admin/drivers"),
  notifications: ()          => api.get("/notifications-secure"),
  financesMonthly:()         => api.get("/admin/finances/monthly"),
  vendorCategories:()         => api.get("/admin/vendor-categories"),
  settings:      ()          => api.get("/admin/settings"),
  saveSettings:  (updates)   => api.patch("/admin/settings", { updates }),
  comments:      (approved)  => api.get("/admin/comments", { approved }),
  approveComment:(id)        => api.patch(`/admin/comments/${id}`, { approved: true }),
  deleteComment: (id)        => api.delete(`/admin/comments/${id}`),
  setFeatured:   (id, v)     => api.patch(`/admin/products/${id}/featured`, { featured: v }),
  users:         (params)    => api.get("/admin/users", params),
  toggleUser:    (id, v)     => api.patch(`/admin/users/${id}`, { active: v }),
  mapLieux:      ()          => api.get("/admin/map-lieux"),
  addLieu:       (data)      => api.post("/admin/map-lieux", data),
  updateLieu:    (id, data)  => api.patch(`/admin/map-lieux/${id}`, data),
  deleteLieu:    (id)        => api.delete(`/admin/map-lieux/${id}`),
  // Zones de livraison — ROUTE SÉCURISÉE (JWT utilisateur + RLS, corrige 42501)
  zones:         ()          => api.get("/zones-secure"),
  addZone:       (data)      => api.post("/zones-secure", data),
  updateZone:    (id, data)  => api.patch(`/zones-secure/${id}`, data),
  deleteZone:    (id)        => api.delete(`/zones-secure/${id}`),
  // Catégories de produits
  categories:    ()          => api.get("/admin/categories"),
  addCategory:   (data)      => api.post("/admin/categories", data),
  deleteCategory:(id)        => api.delete(`/admin/categories/${id}`),
  // Admins
  admins:        ()          => api.get("/admin/admins"),
  addAdmin:      (data)      => api.post("/admin/admins", data),
  updateAdmin:   (id, data)  => api.patch(`/admin/admins/${id}`, data),
  deleteAdmin:   (id)        => api.delete(`/admin/admins/${id}`),
  // Thèmes
  themes:        ()          => api.get("/admin/themes"),
  saveTheme:     (theme)     => api.patch("/admin/themes", { theme }),
};

export const Payments = {
  initiate: (order_id) => api.post("/payments/initiate", { order_id }),
};

export const Messages = {
  conversations: ()    => api.get("/messages/conversations"),
  contacts:      ()    => api.get("/messages/contacts"),
  get:           (id)  => api.get(`/messages/${id}`),
  send:          (id, content) => api.post(`/messages/${id}/send`, { content }),
  start:         (subject, firstMessage) => api.post("/messages/start", { subject, firstMessage }),
  markRead:      (id)  => api.patch(`/messages/${id}/read`),
};

export const Vendor = {
  products: ()        => api.get("/vendor/products"),
  clients:  ()        => api.get("/vendor/clients"),
  notify:   (data)    => api.post("/vendor/notify", data),
  upload:   (data)    => api.post("/vendor/upload", data),
};

export const Zones = {
  list: () => api.get("/zones"),
};

// Utilitaire : échapper le HTML pour éviter XSS dans l'affichage
export function escapeHtml(str) {
  if (typeof str !== "string") return str;
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}