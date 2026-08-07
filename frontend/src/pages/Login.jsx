import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Toast from "../components/Toast";

const ROLES = {
  client:  { ico:"👤", label:"Client",      color:"from-emerald-600 to-emerald-800" },
  vendor:  { ico:"🏪", label:"Commerçant",  color:"from-blue-600 to-blue-800" },
  livreur: { ico:"🛵", label:"Livreur",     color:"from-orange-500 to-orange-700" },
  admin:   { ico:"🔐", label:"Admin",       color:"from-slate-700 to-slate-900" },
  superadmin: { ico:"👑", label:"Superadmin", color:"from-purple-700 to-purple-900" },
};

export default function Login() {
  const [params] = useSearchParams();
  const type = params.get("type") || "client";
  const role = ROLES[type] || ROLES.client;
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const profile = await login(email, password);
      const routes = { client:"/accueil", vendor:"/vendor", livreur:"/livreur", admin:"/admin", superadmin:"/superadmin" };
      nav(routes[profile.type] || "/accueil");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`bg-linear-to-br ${role.color} py-10 text-center`}>
        <div className="text-4xl mb-2">{role.ico}</div>
        <h2 className="text-white text-xl font-semibold">Espace {role.label}</h2>
        <p className="text-white/60 text-sm mt-1">SoubreMarket</p>
      </div>

      <div className="flex-1 flex justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
          {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Mot de passe</label>
              <input type="password" required value={password} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {type !== "admin" && type !== "superadmin" && (
            <div className="mt-4 text-center">
              <Link to={`/register?type=${type}`} className="text-emerald-600 text-sm hover:underline">
                Pas encore de compte ? S'inscrire
              </Link>
            </div>
          )}
          <div className="mt-2 text-center">
            <Link to="/" className="text-gray-400 text-xs hover:text-gray-600">← Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
}