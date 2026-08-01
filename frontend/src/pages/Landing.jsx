import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-2">
          Soubre<span className="text-emerald-300">Market</span>
        </h1>
        <p className="text-emerald-200 italic text-sm mt-2">
          « Achetez sans quitter le confort de votre maison. »
        </p>
        <div className="flex justify-center gap-8 mt-6 text-emerald-200">
          {[["🛍️","Commandez"],["🚀","Livraison rapide"],["💬","Avis clients"],["🤖","Assistant IA"]].map(([e,l])=>(
            <div key={l} className="text-center">
              <div className="text-2xl">{e}</div>
              <div className="text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-4">
        {[
          { ico:"👤", label:"Client", sub:"Achetez & faites-vous livrer", path:"/login?type=client" },
          { ico:"🏪", label:"Commerçant", sub:"Gérez vos ventes", path:"/login?type=vendor" },
        ].map((c) => (
          <button key={c.label} onClick={() => nav(c.path)}
            className="bg-white/10 hover:bg-white/20 border border-white/25 rounded-2xl p-5 text-center transition-all hover:scale-105 active:scale-95">
            <div className="text-4xl mb-2">{c.ico}</div>
            <div className="text-white font-semibold text-base">{c.label}</div>
            <div className="text-emerald-200 text-xs mt-1">{c.sub}</div>
          </button>
        ))}
      </div>

      <button onClick={() => nav("/login?type=livreur")}
        className="w-full max-w-md bg-white/10 hover:bg-white/20 border border-white/25 rounded-xl p-4 flex items-center gap-4 transition-all hover:scale-[1.02] mb-3">
        <span className="text-3xl">🛵</span>
        <div className="text-left flex-1">
          <div className="text-white font-semibold">Devenir livreur</div>
          <div className="text-emerald-200 text-xs">Inscription soumise à validation admin</div>
        </div>
        <span className="text-emerald-300 text-sm">→</span>
      </button>

      <button onClick={() => nav("/login?type=admin")}
        className="text-white/30 text-xs hover:text-white/60 transition-colors mt-2">
        ⚙️ Accès administrateur
      </button>
    </div>
  );
}