const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    return localStorage.getItem("soubremarket_token");
  }

  setToken(token) {
    localStorage.setItem("soubremarket_token", token);
  }

  removeToken() {
    localStorage.removeItem("soubremarket_token");
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
      const data = await res.json();

      if (!res.ok) {
        // Token expiré → déconnexion automatique
        if (res.status === 401) {
          this.removeToken();
          window.dispatchEvent(new Event("auth:logout"));
        }
        throw new Error(data.error || `Erreur ${res.status}`);
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
}

export const api = new ApiClient();

// ─── API endpoints ───────────────────────────────────────────
export const Auth = {
  login:    (data)        => api.post("/auth/login", data),
  register: (data)        => api.post("/auth/register", data),
  logout:   ()            => api.post("/auth/logout"),
  me:       ()            => api.get("/auth/me"),
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
};

export const Payments = {
  initiate: (order_id) => api.post("/payments/initiate", { order_id }),
};