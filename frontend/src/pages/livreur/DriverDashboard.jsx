import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bell, MapPin, Package, Camera, PenLine, CheckCircle2, XCircle,
  Navigation, Bike, Star, TrendingUp, Clock, ChevronDown, ChevronUp,
  Wallet, Route, DollarSign, Zap, Phone, MessageCircle, Power, Home
} from "lucide-react";
import { useOrders } from "../../hooks/useOrders";
import { Orders } from "../../api/client";
import { useLivreurGPS } from "../../hooks/useLivreurGPS";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const fmtEuro = (n) => (Number(n) || 0).toFixed(2) + " €";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";

// Aucune donnée mockée. Toutes les données proviennent de l'API /orders.

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : BANNIÈRE PUSH NOTIFICATION
   ═══════════════════════════════════════════════════════════ */
function PushBanner({ visible, onOpen, online }) {
  if (!visible) return null;
  return (
    <div className="absolute top-0 left-0 right-0 z-50 px-3 pt-3 animate-slide-down">
      <button
        onClick={onOpen}
        className="w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <Bike size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Nouvelle course disponible !</p>
          <p className="text-xs text-gray-300 truncate mt-0.5">
            {online ? "Sushi Bar ➔ 2.4 km • 8.50 €" : "Passez en ligne pour recevoir des alertes"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-emerald-400 font-semibold">Maintenant</span>
          <div className="flex gap-1 justify-end mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/30" />
          </div>
        </div>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT : CARTE MOCK (60% de l'écran)
   ═══════════════════════════════════════════════════════════ */
function MockMap({ pickup, dropoff }) {
  return (
    <div className="relative h-64 bg-emerald-50 rounded-2xl overflow-hidden border border-emerald-100">
      {/* Rues */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 right-0 h-2 bg-white border-y border-gray-200" />
        <div className="absolute top-1/2 left-0 right-0 h-3 bg-white border-y border-gray-200" />
        <div className="absolute top-3/4 left-0 right-0 h-2 bg-white border-y border-gray-200" />
        <div className="absolute left-1/4 top-0 bottom-0 w-2 bg-white border-x border-gray-200" />
        <div className="absolute left-1/2 top-0 bottom-0 w-3 bg-white border-x border-gray-200" />
        <div className="absolute left-3/4 top-0 bottom-0 w-2 bg-white border-x border-gray-200" />
      </div>

      {/* Parc */}
      <div className="absolute top-2 left-2 w-20 h-16 bg-emerald-200/60 rounded-lg" />
      <div className="absolute bottom-2 right-2 w-24 h-14 bg-emerald-200/60 rounded-lg" />

      {/* Point départ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
          <Bike size={20} />
        </div>
      </div>

      {/* Point arrivée */}
      <div className="absolute top-1/4 right-1/4">
        <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg">
          <MapPin size={16} />
        </div>
      </div>

      {/* Trajet */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M 50 50 C 60 45, 65 40, 70 35 C 72 33, 74 30, 75 28"
          stroke="#0F6E56"
          strokeWidth="2"
          strokeDasharray="4 3"
          fill="none"
        />
      </svg>

      {/* Labels */}
      <div className="absolute top-1/2 left-1/2 translate-x-4 translate-y-2">
        <span className="text-[10px] font-semibold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full">Départ</span>
      </div>
      <div className="absolute top-1/4 right-1/4 translate-x-4">
        <span className="text-[10px] font-semibold text-red-600 bg-white/80 px-2 py-0.5 rounded-full">Arrivée</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VUE 1 : COURSE ACTIVE (Machine d'état)
   ═══════════════════════════════════════════════════════════ */
function ActiveCourseView({ online, setOnline, state, setState, offer, onConfirm, onAccept, onPicked }) {
  // État 0 : En attente
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Bike size={36} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">En attente de courses...</h2>
        <p className="text-sm text-gray-400 mt-1">
          {online ? "Vous êtes en ligne. Les nouvelles courses apparaîtront ici." : "Passez en ligne pour recevoir des alertes."}
        </p>
        {!online && (
          <button
            onClick={() => setOnline(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Power size={18} />
            Passer en ligne
          </button>
        )}
      </div>
    );
  }

  // État 1 : Offre disponible
  if (state === "offered") {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              <Clock size={12} />
              Nouvelle offre
            </span>
            <span className="text-xs text-gray-400">Expire dans 00:45</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Package size={22} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{offer.vendor}</p>
              <p className="text-xs text-gray-400">{offer.orderNumber || offer.id}</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <MapPin size={12} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Retrait</p>
                <p className="text-sm font-medium text-gray-800">{offer.pickup}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                <MapPin size={12} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Livraison</p>
                <p className="text-sm font-medium text-gray-800">{offer.dropoff}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <Route size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-gray-800">{offer.distance} km</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" />
              <span className="text-lg font-bold text-emerald-600">{fmtEuro(offer.base)}</span>
            </div>
          </div>

          <button
            onClick={onAccept}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            Accepter la course
          </button>
        </div>
      </div>
    );
  }

  // État 2 : En route
  if (state === "picked") {
    return (
      <div className="space-y-4">
        <MockMap pickup={offer.pickup} dropoff={offer.dropoff} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              <Navigation size={12} />
              En route
            </span>
            <span className="text-xs text-gray-400">{offer.orderNumber || offer.id}</span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <MapPin size={12} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Retrait</p>
                <p className="text-sm font-medium text-gray-800">{offer.pickup}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                <MapPin size={12} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Livraison</p>
                <p className="text-sm font-medium text-gray-800">{offer.dropoff}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <a href="tel:+2250707070707" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Phone size={18} />
              Appeler
            </a>
            <a href="https://wa.me/2250707070707" target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>

          <button
            onClick={onPicked}
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            📦 Colis récupéré — En route !
          </button>
        </div>
      </div>
    );
  }

  // État 3 : Preuve de livraison
  if (state === "delivering") {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
              <Camera size={12} />
              Preuve de livraison
            </span>
            <span className="text-xs text-gray-400">{offer.orderNumber || offer.id}</span>
          </div>

          {/* Upload photo */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-4 hover:border-emerald-300 transition-colors cursor-pointer">
            <Camera size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Photo du colis livré</p>
            <p className="text-xs text-gray-400 mt-1">Touchez pour prendre une photo</p>
          </div>

          {/* Signature */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Signature du client</p>
            <div className="border-2 border-gray-200 rounded-xl h-24 flex items-center justify-center bg-gray-50">
              <PenLine size={20} className="text-gray-300" />
              <span className="text-xs text-gray-400 ml-2">Zone de signature</span>
            </div>
          </div>

          <button
            onClick={onConfirm}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            ✅ Confirmer la livraison
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   VUE 2 : MES GAINS & HISTORIQUE
   ═══════════════════════════════════════════════════════════ */
function EarningsView({ history }) {
  const [expanded, setExpanded] = useState(null);

  // Calculs dynamiques via reduce
  const stats = useMemo(() => {
    return history.reduce((acc, h) => {
      acc.total += h.base + h.tip;
      acc.count += 1;
      acc.tips += h.tip;
      acc.distance += h.distance;
      return acc;
    }, { total: 0, count: 0, tips: 0, distance: 0 });
  }, [history]);

  // Répartition par jour (Lun-Dim)
  const daily = useMemo(() => {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const values = [0, 0, 0, 0, 0, 0, 0];
    history.forEach(h => {
      const day = new Date(h.date).getDay();
      const idx = day === 0 ? 6 : day - 1; // Dimanche -> index 6
      values[idx] += h.base + h.tip;
    });
    const max = Math.max(...values, 1);
    return days.map((d, i) => ({ day: d, value: values[i], pct: (values[i] / max) * 100 }));
  }, [history]);

  const metricCards = [
    { label: "Gains Totaux", value: fmtEuro(stats.total), icon: Wallet, color: "bg-emerald-100 text-emerald-600" },
    { label: "Courses", value: stats.count, icon: Bike, color: "bg-blue-100 text-blue-600" },
    { label: "Pourboires", value: fmtEuro(stats.tips), icon: Star, color: "bg-amber-100 text-amber-600" },
    { label: "Distance", value: stats.distance.toFixed(1) + " km", icon: Route, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3">
        {metricCards.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${m.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-lg font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Graphique hebdomadaire */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Performance hebdomadaire</h3>
          <TrendingUp size={16} className="text-emerald-600" />
        </div>
        <div className="flex items-end justify-between gap-2 h-28">
          {daily.map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              <span className="text-[9px] text-gray-400 font-medium">{d.value > 0 ? fmtEuro(d.value) : ""}</span>
              <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: 80 }}>
                <div
                  className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500"
                  style={{ height: `${d.pct}%`, minHeight: d.value > 0 ? 8 : 2 }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historique */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Historique des livraisons</h3>
        <div className="space-y-3">
          {history.map((h) => {
            const isOpen = expanded === h.id;
            return (
              <div key={h.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : h.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{h.vendor}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                        <CheckCircle2 size={10} />
                        Livré
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {h.id} • {fmtDate(h.date)} à {fmtTime(h.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmtEuro(h.base)}</p>
                    {h.tip > 0 && (
                      <p className="text-[10px] text-amber-600 font-medium">+ {fmtEuro(h.tip)} pourboire</p>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400">Retrait</p>
                          <p className="text-xs font-medium text-gray-700">{h.pickup}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400">Livraison</p>
                          <p className="text-xs font-medium text-gray-700">{h.dropoff}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Route size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{h.distance} km</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Gain total</span>
                      <span className="font-bold text-emerald-600">{fmtEuro(h.base + h.tip)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL : DRIVER DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function DriverDashboard() {
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState("active");
  const [state, setState] = useState("idle");
  const [offer, setOffer] = useState(null);
  const [history, setHistory] = useState([]);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushError, setPushError] = useState(false);

  // Charger les vraies commandes disponibles (pending) et les missions livrées du livreur
  const { orders: pendingOrders, refetch: refetchPending } = useOrders({ status: "pending" });
  const { orders: myOrders, refetch: refetchMine } = useOrders({ limit: 20 });

  // Hydrater l'historique depuis les vraies commandes livrées du livreur
  useEffect(() => {
    if (myOrders?.length > 0) {
      const delivered = myOrders
        .filter(o => o.status === "delivered")
        .map(o => ({
          id: o.orderNumber || o.id,
          vendor: o.vendor?.shopName || "Vendeur",
          pickup: o.vendor?.address || "Retrait",
          dropoff: o.client?.address || "Livraison",
          distance: o.zone?.max_km || 0,
          base: o.total || 0,
          tip: 0,
          status: "delivered",
          date: o.createdAt || o.created_at,
        }));
      setHistory(delivered);
    }
  }, [myOrders]);

  // GPS actif quand en ligne
  useLivreurGPS(online);

  // Fermer la bannière après 5s
  useEffect(() => {
    if (!pushVisible) return;
    const t = setTimeout(() => setPushVisible(false), 5000);
    return () => clearTimeout(t);
  }, [pushVisible]);

  const triggerPush = () => {
    if (!online) {
      setPushError(true);
      setTimeout(() => setPushError(false), 3000);
      return;
    }
    setPushError(false);
    setPushVisible(true);
  };

  const openPush = () => {
    setPushVisible(false);
    setTab("active");
    // Prendre la première commande disponible de l'API
    if (pendingOrders.length > 0) {
      const order = pendingOrders[0];
      setOffer({
        id: order.id, // UUID réel pour l'API
        orderNumber: order.orderNumber || order.id, // numéro pour l'affichage
        vendor: order.vendor?.shopName || "Vendeur",
        pickup: order.vendor?.address || "Retrait",
        dropoff: order.client?.address || "Livraison",
        distance: order.zone?.max_km || 0,
        base: order.total || 0,
        tip: 0,
        status: "offered",
      });
      setState("offered");
    } else {
      setState("idle");
    }
  };

  const acceptOffer = () => {
    if (offer?.id) {
      // Accepter la mission via l'API
      Orders.setStatus(offer.id, "assigned").then(() => {
        refetchPending();
        refetchMine();
      }).catch(console.error);
    }
    setState("picked");
  };

  const pickedUp = () => {
    if (offer?.id) {
      Orders.setStatus(offer.id, "delivering").catch(console.error);
    }
    setState("delivering");
  };

  const confirmDelivery = () => {
    if (offer?.id) {
      Orders.setStatus(offer.id, "delivered")
        .then(() => {
          // Ajouter la course à l'historique
          setHistory(prev => [
            { ...offer, status: "delivered", date: new Date().toISOString() },
            ...prev,
          ]);
          refetchPending();
          refetchMine();
        })
        .catch(console.error);
    }
    // Réinitialiser
    setState("idle");
    setOffer(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Cadre téléphone */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-gray-900" style={{ height: "min(90vh, 800px)" }}>
        {/* Encoche */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-40" />

        {/* Bannière push */}
        <PushBanner visible={pushVisible} onOpen={openPush} online={online} />

        {/* Erreur push */}
        {pushError && (
          <div className="absolute top-0 left-0 right-0 z-50 px-3 pt-3 animate-slide-down">
            <div className="bg-red-500 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
              <XCircle size={20} className="shrink-0" />
              <p className="text-sm font-semibold">Passez en ligne pour recevoir des alertes</p>
            </div>
          </div>
        )}

        {/* Contenu */}
        <div className="h-full flex flex-col pt-10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">🛵 Livreur</h1>
              <p className="text-xs text-gray-400">SoubreMarket Delivery</p>
            </div>
            {/* Toggle en ligne */}
            <button
              onClick={() => setOnline(o => !o)}
              className={`relative w-16 h-8 rounded-full transition-colors ${online ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${online ? "left-9" : "left-1"}`}
              />
              <span className={`absolute top-1/2 -translate-y-1/2 text-[8px] font-bold text-white ${online ? "left-2" : "right-2"}`}>
                {online ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {tab === "active" ? (
              <ActiveCourseView
                online={online}
                setOnline={setOnline}
                state={state}
                setState={setState}
                offer={offer}
                onAccept={acceptOffer}
                onPicked={pickedUp}
                onConfirm={confirmDelivery}
              />
            ) : (
              <EarningsView history={history} />
            )}
          </div>

          {/* Bottom navigation */}
          <div className="border-t border-gray-100 bg-white px-4 py-2 flex gap-2">
            <button
              onClick={() => setTab("active")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                tab === "active" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <Navigation size={20} />
              <span className="text-[10px] font-semibold">Course Active</span>
            </button>
            <button
              onClick={() => setTab("earnings")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                tab === "earnings" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <Wallet size={20} />
              <span className="text-[10px] font-semibold">Mes Gains</span>
            </button>
          </div>
        </div>
      </div>

      {/* Panneau de simulation push (hors cadre) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={triggerPush}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-full shadow-xl transition-colors"
        >
          <Bell size={16} />
          Simuler une Notification Push
        </button>
      </div>
    </div>
  );
}