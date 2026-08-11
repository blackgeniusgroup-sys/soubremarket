import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Auth } from "../api/client";
import Toast from "../components/Toast";

// Véhicules qui ne nécessitent PAS de permis
const NO_PERMIS_VEHICULES = ["Vélo", "Scooter électrique"];

export default function Register() {
  const [params]  = useSearchParams();
  const type      = params.get("type") || "client";
  const { register } = useAuth();
  const nav       = useNavigate();
  const [form, setForm]       = useState({ name:"", email:"", password:"", phone:"", type, vehicule:"Moto", zone:"Centre-ville", shop_name:"", whatsapp:"", permis:"non" });
  const [photo, setPhoto]     = useState(null);
  const [permisRecto, setPermisRecto] = useState(null);
  const [permisVerso, setPermisVerso] = useState(null);
  const [cniPhoto, setCniPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [done, setDone]       = useState(false);

  const permisDesactive = NO_PERMIS_VEHICULES.includes(form.vehicule);

  const readFile = (file, setter) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setter(ev.target.result);
    r.readAsDataURL(file);
  };

  const handlePhoto = (e) => readFile(e.target.files[0], setPhoto);
  const handlePermisRecto = (e) => readFile(e.target.files[0], setPermisRecto);
  const handlePermisVerso = (e) => readFile(e.target.files[0], setPermisVerso);
  const handleCniPhoto = (e) => readFile(e.target.files[0], setCniPhoto);

  // Vérifie si le formulaire livreur peut être soumis
  const validateLivreur = () => {
    if (!photo) return "La photo d'identification est obligatoire";
    if (!cniPhoto) return "La photo CNI/Passeport est obligatoire";
    if (!permisDesactive && form.permis === "oui") {
      if (!permisRecto) return "La photo du permis (recto) est obligatoire";
      if (!permisVerso) return "La photo du permis (verso) est obligatoire";
    }
    return null;
  };

  const uploadImage = async (base64, fileName, folder) => {
    if (!base64) return null;
    // Extraire l'extension depuis le data URL
    const match = base64.match(/^data:(image\/(?:jpeg|png|webp|gif));/);
    const ext = match ? match[1].split("/")[1] : "png";
    const { url } = await Auth.upload({ file_base64: base64, file_name: `${fileName}.${ext}`, folder });
    return url;
  };

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (type === "livreur") {
        const validationError = validateLivreur();
        if (validationError) throw new Error(validationError);
      }

      const payload = { ...form };

      // Uploader les images d'abord, puis envoyer les URLs
      if (type === "livreur") {
        const uploads = await Promise.all([
          uploadImage(photo, "photo-profil", "profiles"),
          uploadImage(cniPhoto, "cni-passeport", "documents"),
        ]);
        payload.photo_url = uploads[0];
        payload.cni_url = uploads[1];
        payload.permis = permisDesactive ? "non" : (form.permis || "non");

        if (!permisDesactive && payload.permis === "oui") {
          const [rectoUrl, versoUrl] = await Promise.all([
            uploadImage(permisRecto, "permis-recto", "documents"),
            uploadImage(permisVerso, "permis-verso", "documents"),
          ]);
          payload.permis_recto_url = rectoUrl;
          payload.permis_verso_url = versoUrl;
        } else {
          payload.permis_recto_url = null;
          payload.permis_verso_url = null;
        }
      }

      await register(payload);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8 text-center">
        <div className="text-5xl mb-4">{type === "livreur" ? "⏳" : "✅"}</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {type === "livreur" ? "Demande envoyée !" : "Compte créé !"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {type === "livreur"
            ? "Votre demande sera examinée par l'administrateur sous 24h."
            : "Votre compte est actif. Vous pouvez vous connecter."}
        </p>
        <button onClick={() => nav(`/login?type=${type}`)}
          className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg">
          Se connecter →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 py-8 text-center">
        <h2 className="text-white text-xl font-semibold capitalize">Inscription {type}</h2>
        <p className="text-emerald-200 text-sm mt-1">SoubreMarket</p>
      </div>

      <div className="flex-1 flex justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
          {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

          {type === "livreur" && (
            <div className="text-center mb-5">
              <div onClick={() => document.getElementById("photo-input").click()}
                className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 mx-auto flex items-center justify-center cursor-pointer overflow-hidden hover:bg-emerald-100 transition-colors">
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">📷</span>}
              </div>
              <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <p className="text-xs text-gray-400 mt-1">Photo obligatoire pour identification</p>
            </div>
          )}

          <form onSubmit={handle} className="space-y-3">
            {[
              ["Nom complet *","name","text","Prénom Nom"],
              ["Email *","email","email","votre@email.com"],
              ["Mot de passe *","password","password","Minimum 8 caractères"],
              ["Téléphone","phone","tel","+225 07 00 00 00 00"],
            ].map(([lbl, key, typ, ph]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{lbl}</label>
                <input type={typ} placeholder={ph} required={lbl.includes("*")}
                  value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            ))}

            {type === "vendor" && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom de la boutique *</label>
                  <input type="text" required placeholder="Ma Boutique" value={form.shop_name}
                    onChange={e=>setForm(f=>({...f,shop_name:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">WhatsApp Business</label>
                  <input type="tel" placeholder="2250700000001" value={form.whatsapp}
                    onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </>
            )}

            {type === "livreur" && (
              <>
                {/* Véhicule */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Véhicule</label>
                  <select value={form.vehicule} onChange={e=>setForm(f=>({...f,vehicule:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {["Moto","Moto électrique","Vélo","Scooter électrique","Voiture","Tricycle"].map(v=><option key={v}>{v}</option>)}
                  </select>
                  {permisDesactive && (
                    <p className="text-xs text-emerald-600 mt-1">ℹ️ Pas de permis requis pour ce véhicule.</p>
                  )}
                </div>

                {/* Permis de conduire — désactivé pour Vélo / Scooter électrique */}
                <div className={permisDesactive ? "opacity-50 pointer-events-none" : ""}>
                  <label className="block text-xs text-gray-500 mb-1">Permis de conduire</label>
                  <select value={form.permis} onChange={e=>setForm(f=>({...f,permis:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <option value="non">Non</option>
                    <option value="oui">Oui</option>
                  </select>
                </div>

                {/* Photos du permis — seulement si permis = oui et véhicule non exempt */}
                {!permisDesactive && form.permis === "oui" && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-semibold text-amber-700">🪪 Permis de conduire — recto / verso</p>

                    <div className="flex gap-2">
                      {/* Recto */}
                      <div className="flex-1">
                        <div onClick={() => document.getElementById("permis-recto-input").click()}
                          className="h-24 bg-white border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden hover:bg-amber-50 transition-colors">
                          {permisRecto ? <img src={permisRecto} alt="Permis recto" className="w-full h-full object-cover" /> : <span className="text-xs text-amber-500 text-center px-1">📄 Recto</span>}
                        </div>
                        <input id="permis-recto-input" type="file" accept="image/*" className="hidden" onChange={handlePermisRecto} />
                        <p className="text-[10px] text-gray-400 mt-1 text-center">Recto *</p>
                      </div>

                      {/* Verso */}
                      <div className="flex-1">
                        <div onClick={() => document.getElementById("permis-verso-input").click()}
                          className="h-24 bg-white border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden hover:bg-amber-50 transition-colors">
                          {permisVerso ? <img src={permisVerso} alt="Permis verso" className="w-full h-full object-cover" /> : <span className="text-xs text-amber-500 text-center px-1">📄 Verso</span>}
                        </div>
                        <input id="permis-verso-input" type="file" accept="image/*" className="hidden" onChange={handlePermisVerso} />
                        <p className="text-[10px] text-gray-400 mt-1 text-center">Verso *</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CNI / Passeport — toujours requis */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CNI / Passeport *</label>
                  <div onClick={() => document.getElementById("cni-input").click()}
                    className="h-24 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden hover:bg-gray-50 transition-colors">
                    {cniPhoto ? <img src={cniPhoto} alt="CNI/Passeport" className="w-full h-full object-cover" /> : (
                      <div className="text-center">
                        <span className="text-2xl block">🪪</span>
                        <span className="text-xs text-gray-400">Cliquer pour charger</span>
                      </div>
                    )}
                  </div>
                  <input id="cni-input" type="file" accept="image/*" className="hidden" onChange={handleCniPhoto} />
                  <p className="text-[10px] text-gray-400 mt-1">Photo de votre CNI ou Passeport (recto)</p>
                </div>

                {/* Zone de travail */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zone de travail</label>
                  <select value={form.zone} onChange={e=>setForm(f=>({...f,zone:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {["Centre-ville","Quartier Nord","Quartier Sud","Périphérie","Zone rurale"].map(z=><option key={z}>{z}</option>)}
                  </select>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  ℹ️ Votre dossier sera examiné par l'administrateur avant activation.
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 mt-2">
              {loading ? "Envoi en cours..." : type === "livreur" ? "📤 Soumettre ma demande" : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to={`/login?type=${type}`} className="text-gray-400 text-xs hover:text-gray-600">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}