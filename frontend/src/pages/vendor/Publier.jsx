import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Products } from "../../api/client";
import Toast from "../../components/Toast";

const CATS = ["Alimentation","Agriculture","Artisanat","Beauté","Électronique","Vêtements"];
const EMOJIS = { Alimentation:"🥘", Agriculture:"🌿", Artisanat:"🎨", Beauté:"✨", Électronique:"📱", Vêtements:"👕" };

export default function Publier() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name:"", description:"", price:"", stock:"", category:"Alimentation", featured:false });
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Products.create({ ...form, price:+form.price, stock:+form.stock, emoji:EMOJIS[form.category] });
      setToast({ message:"Article publié avec succès ! ✓", type:"success" });
      setTimeout(() => nav("/vendor"), 1500);
    } catch (err) {
      setToast({ message:err.message, type:"error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={()=>nav(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-lg font-bold text-gray-800">Publier un article</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom du produit *</label>
            <input required type="text" placeholder="Ex: Riz local 5kg" value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix (F CFA) *</label>
              <input required type="number" min="1" placeholder="3500" value={form.price}
                onChange={e=>setForm(f=>({...f,price:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stock *</label>
              <input required type="number" min="0" placeholder="20" value={form.stock}
                onChange={e=>setForm(f=>({...f,stock:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea rows={3} placeholder="Décrivez votre produit..." value={form.description}
              onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e=>setForm(f=>({...f,featured:e.target.checked}))}
              className="w-4 h-4 accent-emerald-600" />
            <span className="text-sm text-gray-700">⭐ Mettre ce produit à la Une</span>
          </label>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          💡 Une commission de <strong>10%</strong> sera automatiquement prélevée sur chaque vente pour l'entretien de la plateforme.
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-base transition-all disabled:opacity-60 shadow-lg shadow-emerald-200">
          {loading ? "Publication en cours..." : "🚀 Publier l'article"}
        </button>
      </form>
    </div>
  );
}