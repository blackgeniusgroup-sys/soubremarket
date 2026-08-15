const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
    this.tokenKey = "soubremarket_token";
    this.refreshKey = "soubremarket_refresh_token";
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken() {
    return localStorage.getItem(this.refreshKey);
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(this.tokenKey, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.refreshKey, refreshToken);
    }
  }

  removeTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Gérer les réponses vides (204, etc.)
      if (res.status === 204) {
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        // Token expiré → déconnexion automatique
        if (res.status === 401) {
          this.removeTokens();
          window.dispatchEvent(new Event("auth:logout"));
        }
        // HTTP 429 — Trop de requêtes : ne pas faire crasher l'interface
        if (res.status === 429) {
          // Notifie l'UI sans lever d'exception fatale (le polling continue avec les dernières données)
          window.dispatchEvent(new CustomEvent("api:rate-limited", {
            detail: { endpoint, message: typeof data === "string" ? data : (data.error || "Trop de requêtes, veuillez patienter.") }
          }));
          // Retourne null pour les lectures (GET) → les fallbacks côté composants s'appliquent
          if (options.method === "GET" || options.method === undefined) {
            return null;
          }
          // Pour les écritures, on remonte l'erreur pour afficher le message
          throw new Error(typeof data === "string" ? data : (data.error || "Trop de requêtes, réessayez dans quelques minutes."));
        }
        throw new Error(typeof data === "string" ? data : (data.error || data.message || `Erreur ${res.status}`));
      }

      return data;
    } catch (err) {
      if (err.name === "TypeError") {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      throw err;
    }
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
  notifications: ()          => api.get("/admin/notifications"),
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
  // Zones de livraison
  zones:         ()          => api.get("/admin/zones"),
  addZone:       (data)      => api.post("/admin/zones", data),
  updateZone:    (id, data)  => api.patch(`/admin/zones/${id}`, data),
  deleteZone:    (id)        => api.delete(`/admin/zones/${id}`),
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