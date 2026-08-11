import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Bike, Car, Search, X, Phone, Star, Zap, MapPin, Navigation, Battery, Clock } from "lucide-react";

// ─── Données simulées des livreurs ─────────────────────────────
const INITIAL_DRIVERS = [
  {
    id: "DRV-001",
    name: "Kouassi Jean",
    vehicleType: "Moto",
    battery: 85,
    status: "Disponible",
    currentOrder: null,
    avatar: "KJ",
    x: 22,
    y: 35,
    phone: "+225 07 45 12 34 56",
    rating: 4.9,
    deliveries: 342,
    startedAt: null,
  },
  {
    id: "DRV-002",
    name: "Aya Marie",
    vehicleType: "Scooter",
    battery: 62,
    status: "En Course",
    currentOrder: "CMD-8F3K2A",
    avatar: "AM",
    x: 58,
    y: 28,
    phone: "+225 05 67 89 01 23",
    rating: 4.8,
    deliveries: 287,
    startedAt: Date.now() - 12 * 60 * 1000,
  },
  {
    id: "DRV-003",
    name: "Traoré Moussa",
    vehicleType: "Voiture",
    battery: 15,
    status: "En Course",
    currentOrder: "CMD-2B7X9Q",
    avatar: "TM",
    x: 74,
    y: 62,
    phone: "+225 01 23 45 67 89",
    rating: 4.7,
    deliveries: 198,
    startedAt: Date.now() - 25 * 60 * 1000,
  },
  {
    id: "DRV-004",
    name: "N'Guessan Fatou",
    vehicleType: "Vélo",
    battery: 92,
    status: "Hors-ligne",
    currentOrder: null,
    avatar: "NF",
    x: 38,
    y: 72,
    phone: "+225 07 89 01 23 45",
    rating: 4.6,
    deliveries: 156,
    startedAt: null,
  },
];

// ─── Helpers ───────────────────────────────────────────────────
const STATUS_META = {
  "Disponible": { color: "emerald", dot: "bg-emerald-500", border: "border-emerald-400", ring: "ring-emerald-500/30", pulse: "bg-emerald-400", text: "text-emerald-400", label: "Disponible" },
  "En Course":  { color: "orange",  dot: "bg-orange-500",  border: "border-orange-400",  ring: "ring-orange-500/30",  pulse: "bg-orange-400",  text: "text-orange-400",  label: "En Course" },
  "Hors-ligne": { color: "gray",    dot: "bg-gray-400",    border: "border-gray-500",    ring: "ring-gray-500/30",    pulse: "bg-gray-400",    text: "text-gray-500",    label: "Hors-ligne" },
};

const VEHICLE_ICONS = {
  "Moto": Bike,
  "Scooter": Bike,
  "Voiture": Car,
  "Vélo": Bike,
};

const VEHICLE_COLORS = {
  "Moto": "text-orange-400",
  "Scooter": "text-sky-400",
  "Voiture": "text-violet-400",
  "Vélo": "text-emerald-400",
};

const fmtDuration = (ms) => {
  if (!ms) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}`;
};

// ─── Composant principal ───────────────────────────────────────
export default function LiveDriverMap() {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Animation de déplacement des livreurs "En Course"
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev =>
        prev.map(d => {
          if (d.status !== "En Course") return d;
          const dx = (Math.random() - 0.5) * 3;
          const dy = (Math.random() - 0.5) * 3;
          return {
            ...d,
            x: Math.min(92, Math.max(5, d.x + dx)),
            y: Math.min(88, Math.max(5, d.y + dy)),
          };
        })
      );
      setNow(Date.now());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filtrage
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "Tous" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [drivers, search, statusFilter]);

  const selectedDriver = useMemo(
    () => drivers.find(d => d.id === selectedId) || null,
    [drivers, selectedId]
  );

  const handleSelect = useCallback((id) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { "Tous": drivers.length, "Disponible": 0, "En Course": 0, "Hors-ligne": 0 };
    drivers.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [drivers]);

  const getVehicleIcon = (type) => {
    const Icon = VEHICLE_ICONS[type] || Bike;
    return Icon;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-full">
      {/* ═══════════ RÉPERTOIRE FLOTTE (30%) ═══════════ */}
      <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">🚚 Flotte de Livreurs</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">{drivers.length} livreurs enregistrés</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Recherche */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un livreur..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
          </div>

          {/* Filtres statut */}
          <div className="flex gap-1.5 flex-wrap">
            {["Tous", "Disponible", "En Course", "Hors-ligne"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                  statusFilter === s
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-slate-800/60 text-gray-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {s} <span className="opacity-60">({statusCounts[s] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Liste des livreurs */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredDrivers.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-xs text-gray-500">Aucun livreur trouvé</p>
            </div>
          )}

          {filteredDrivers.map(d => {
            const meta = STATUS_META[d.status];
            const VehicleIcon = getVehicleIcon(d.vehicleType);
            const isSelected = selectedId === d.id;
            const isLowBattery = d.battery < 20;

            return (
              <button
                key={d.id}
                onClick={() => handleSelect(d.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? "bg-slate-800/80 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                      {d.avatar}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${meta.dot} border-2 border-slate-900`} />
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-100 truncate">{d.name}</p>
                      <VehicleIcon className={`w-3.5 h-3.5 shrink-0 ${VEHICLE_COLORS[d.vehicleType] || "text-gray-400"}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${meta.text}`}>
                        {meta.label}
                      </span>
                      {d.currentOrder && (
                        <span className="text-[9px] text-gray-500 font-mono truncate">#{d.currentOrder}</span>
                      )}
                    </div>
                  </div>

                  {/* Batterie */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                      isLowBattery ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      <Battery className="w-2.5 h-2.5" />
                      {d.battery}%
                    </span>
                    <span className="text-[9px] text-gray-600">{d.id}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ CARTE SIMULÉE (70%) ═══════════ */}
      <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden relative min-h-[500px]">
        {/* Carte */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {/* Grille de rues */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }} />

          {/* Grandes artères */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148,163,184,0.4) 2px, transparent 2px),
              linear-gradient(to bottom, rgba(148,163,184,0.4) 2px, transparent 2px)
            `,
            backgroundSize: "192px 192px",
          }} />

          {/* Rivière */}
          <div className="absolute left-[45%] top-0 bottom-0 w-8 bg-gradient-to-b from-sky-900/30 via-sky-800/20 to-sky-900/30 rounded-full blur-[2px]" />

          {/* Parc */}
          <div className="absolute right-[8%] top-[10%] w-40 h-32 rounded-3xl bg-emerald-900/20 border border-emerald-800/20" />

          {/* Landmarks */}
          <div className="absolute left-[8%] top-[8%] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 backdrop-blur border border-slate-700/50">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-medium text-slate-200">Entrepôt Central</span>
          </div>
          <div className="absolute right-[12%] bottom-[12%] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 backdrop-blur border border-slate-700/50">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-medium text-slate-200">Zone Commerciale North</span>
          </div>
          <div className="absolute left-[20%] bottom-[20%] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 backdrop-blur border border-slate-700/50">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-medium text-slate-200">Marché Central</span>
          </div>

          {/* Légende */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-[9px] text-gray-400">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marqueurs dynamiques */}
        {filteredDrivers.map(d => {
          const meta = STATUS_META[d.status];
          const VehicleIcon = getVehicleIcon(d.vehicleType);
          const isSelected = selectedId === d.id;
          const isOffline = d.status === "Hors-ligne";

          return (
            <button
              key={d.id}
              onClick={() => handleSelect(d.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${d.x}%`, top: `${d.y}%`, zIndex: isSelected ? 30 : 10 }}
            >
              {/* Anneau pulsant */}
              {!isOffline && (
                <span className={`absolute inset-0 rounded-full ${meta.pulse} opacity-30 animate-ping`} style={{ width: 44, height: 44, left: -10, top: -10 }} />
              )}

              {/* Pin */}
              <div className={`relative w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                isSelected
                  ? "bg-slate-800 border-emerald-400 scale-125 shadow-lg shadow-emerald-500/30"
                  : `bg-slate-800 ${isOffline ? "border-gray-500 opacity-60" : meta.border}`
              }`}>
                <VehicleIcon className={`w-3 h-3 ${isOffline ? "text-gray-400" : VEHICLE_COLORS[d.vehicleType] || "text-gray-300"}`} />
              </div>

              {/* Étiquette */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-900/80 text-gray-400 border border-slate-700/50 backdrop-blur"
              }`}>
                {d.name.split(" ")[0]}
              </div>
            </button>
          );
        })}

        {/* ═══════════ INFOWINDOW / POPUP ═══════════ */}
        {selectedDriver && (
          <div className="absolute right-4 top-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-40 transition-all duration-500">
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-b border-slate-800">
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-sky-500/30 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-white">
                    {selectedDriver.avatar}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${STATUS_META[selectedDriver.status].dot} border-2 border-slate-900`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{selectedDriver.name}</h3>
                  <p className="text-[10px] text-gray-400">{selectedDriver.id} • {selectedDriver.vehicleType}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">{selectedDriver.rating}</span>
                    <span className="text-[9px] text-gray-500">({selectedDriver.deliveries} livraisons)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Statut & commande */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${
                  selectedDriver.status === "Disponible" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  selectedDriver.status === "En Course" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                  "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[selectedDriver.status].dot}`} />
                  {selectedDriver.status}
                </span>
                {selectedDriver.currentOrder && (
                  <span className="text-[10px] text-gray-400 font-mono">Commande #{selectedDriver.currentOrder}</span>
                )}
              </div>

              {/* Temps écoulé */}
              {selectedDriver.status === "En Course" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/15">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] text-orange-300">
                    En livraison depuis {fmtDuration(now - selectedDriver.startedAt)}
                  </span>
                </div>
              )}

              {/* Batterie */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5" /> Batterie
                </span>
                <span className={`text-[10px] font-bold ${selectedDriver.battery < 20 ? "text-red-400" : "text-emerald-400"}`}>
                  {selectedDriver.battery}%
                </span>
              </div>

              {/* Téléphone */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[10px] text-slate-300">{selectedDriver.phone}</span>
              </div>

              {/* Position */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-slate-300">
                  Position: {selectedDriver.x.toFixed(1)}%, {selectedDriver.y.toFixed(1)}%
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <a
                  href={`https://wa.me/${selectedDriver.phone.replace(/\s/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold hover:bg-emerald-500/25 transition-colors"
                >
                  <Phone className="w-3 h-3" /> Contacter
                </a>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors">
                  <Zap className="w-3 h-3" /> Assigner urgence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compteur en direct */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-slate-300">
            {filteredDrivers.filter(d => d.status === "En Course").length} en course
          </span>
        </div>
      </div>
    </div>
  );
}