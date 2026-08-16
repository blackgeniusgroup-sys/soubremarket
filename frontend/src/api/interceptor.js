/**
 * ═══════════════════════════════════════════════════════════════
 *  INTERCEPTEUR API GLOBAL — SÉCURISÉ (Vite / Vercel)
 * ═══════════════════════════════════════════════════════════════
 *  Problème résolu :
 *  - Les pages de la sidebar restaient vides car le token expirait
 *    et n'était pas rafraîchi automatiquement.
 *  - Chaque changement de page nécessitait une reconnexion manuelle.
 *
 *  Solution :
 *  1. Injecte automatiquement le Bearer Token Supabase dans
 *     chaque requête sortante (fetch / axios).
 *  2. Rafraîchit automatiquement le token expiré via le
 *     refresh_token stocké au login.
 *  3. Rejoue la requête originale après le refresh (aucune
 *     donnée perdue, aucune page vide).
 *  4. Déconnecte proprement si le refresh échoue.
 * ═══════════════════════════════════════════════════════════════
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const TOKEN_KEY = "soubremarket_token";
const REFRESH_KEY = "soubremarket_refresh_token";

// ─── Gestion du stockage des tokens ───────────────────────────
export const tokenStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  removeTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ─── File d'attente des requêtes pendant le refresh ──────────
let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (error = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
};

/**
 * Rafraîchit le token d'accès via le refresh_token.
 * @returns {Promise<string|null>} Nouveau token ou null si échec
 */
async function refreshAccessToken() {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.access_token) return null;

    tokenStore.setTokens(data.access_token, data.refresh_token || refreshToken);
    return data.access_token;
  } catch (err) {
    console.error("Erreur refresh token:", err.message);
    return null;
  }
}

/**
 * Intercepteur fetch global — injecte le Bearer token et
 * gère le refresh automatique en cas de 401.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = tokenStore.getToken();
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    let res = await fetch(`${API_URL}${endpoint}`, config);

    // Token expiré → tenter un refresh automatique
    if (res.status === 401 && token) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        if (newToken) {
          flushQueue();
          // Rejouer la requête originale avec le nouveau token
          config.headers.Authorization = `Bearer ${newToken}`;
          res = await fetch(`${API_URL}${endpoint}`, config);
        } else {
          flushQueue(new Error("Session expirée"));
          tokenStore.removeTokens();
          window.dispatchEvent(new Event("auth:logout"));
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }
      } else {
        // Une autre requête est en train de rafraîchir → attendre
        await new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        });
        // Rejouer avec le nouveau token
        const newToken = tokenStore.getToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          res = await fetch(`${API_URL}${endpoint}`, config);
        } else {
          throw new Error("Session expirée");
        }
      }
    }

    // Gérer les réponses vides (204, etc.)
    if (res.status === 204) return null;

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      // HTTP 429 — Trop de requêtes : ne pas faire crasher l'interface
      if (res.status === 429) {
        window.dispatchEvent(new CustomEvent("api:rate-limited", {
          detail: { endpoint, message: typeof data === "string" ? data : (data.error || "Trop de requêtes, veuillez patienter.") }
        }));
        if (options.method === "GET" || options.method === undefined) return null;
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

/**
 * Intercepteur Axios (si utilisé) — injecte le Bearer token
 * et gère le refresh automatique.
 */
export function setupAxiosInterceptor(axiosInstance) {
  axiosInstance.interceptors.request.use((config) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
        tokenStore.removeTokens();
        window.dispatchEvent(new Event("auth:logout"));
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

export default apiFetch;