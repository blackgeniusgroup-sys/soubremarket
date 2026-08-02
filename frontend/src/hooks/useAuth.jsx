import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Auth, api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session au démarrage
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      Auth.me()
        .then(({ user, profile }) => { setUser(user); setProfile(profile); })
        .catch(() => api.removeToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Écouter l'événement de déconnexion automatique
    const handler = () => { setUser(null); setProfile(null); };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await Auth.login({ email, password });
    api.setToken(data.access_token);
    setUser(data.user);
    setProfile(data.user.profile);
    return data.user.profile;
  }, []);

  const register = useCallback(async (formData) => {
    return Auth.register(formData);
  }, []);

  const logout = useCallback(async () => {
    await Auth.logout().catch(() => {});
    api.removeToken();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);