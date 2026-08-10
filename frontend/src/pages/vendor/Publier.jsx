import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Products } from "../../api/client";
import Toast from "../../components/Toast";

const CATS = ["alimentation","vetements","electronique","maison","beaute","autres"];
const EMOJIS = ["📦","🍎","🥕","🌾","🧴","📱","👕","🛒","🍞","🐟","🐔","🥤"];

export default function Publier() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "", description: "", price: "", stock: "",
    category: "alimentation", emoji: "📦", featured: false
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) {
      return setToast({ message: "Nom, prix et stock sont obligatoires", type: "error" });
    }
    setLoading(true);
    try {
      await Products.create({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        category: form.category,
        emoji: form.emoji,
        featured: form.featured
      });
      setToast({ message: "Produit publié avec succès ! ✅", type: "success" });
      setTimeout(() => nav("/vendor"), 1500);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 px-4 py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-xl font-bold text-gray-800 mb-5">➕ Publier un produit</h1>

      <form onSubmit={handle} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom du produit *</label>
            <input type="text" required value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Tomates fraîches"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
              placeholder="Décrivez votre produit..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix (F CFA) *</label>
              <input type="number" required value={form.price} onChange={e => set("price", e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stock *</label>
              <input type="number" required value={form.stock} onChange={e => set("stock", e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Icône</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(em => (
                <button type="button" key={em} onClick={() => set("emoji", em)}
                  className={`w-10 h-10 rounded-lg text-xl border-2 ${form.emoji === em ? "border-emerald-500 bg-emerald-50" : "border-gray-200"}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600" />
            <span className="text-sm text-gray-600">⭐ Produit en vedette</span>
          </label>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-base transition-all disabled:opacity-60 shadow-lg shadow-emerald-200">
          {loading ? "Publication..." : "✅ Publier le produit"}
        </button>
      </form>
    </div>
  );
}