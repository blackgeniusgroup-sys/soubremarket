import React, { useEffect, useRef } from 'react';

// Carte Leaflet avec position livreur en temps réel
// Soubré, Côte d'Ivoire : lat 5.7868, lng -6.5354
export default function MapView({ livreurPos, vendorPos, clientPos, lieux = [], height = 280, zoom = 14 }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    // Charger Leaflet dynamiquement
    const L = window.L;
    if (!L || leafletRef.current) return;

    const center = vendorPos
      ? [vendorPos.lat, vendorPos.lng]
      : [5.7868, -6.5354]; // Centre de Soubré

    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
    leafletRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Icônes personnalisées
    const makeIcon = (emoji, color) => L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Marqueur vendeur
    if (vendorPos) {
      markersRef.current.vendor = L.marker([vendorPos.lat, vendorPos.lng], { icon: makeIcon('🏪', '#1D9E75') })
        .addTo(map).bindPopup(`<b>Vendeur</b><br>${vendorPos.label || ''}`);
    }
    // Marqueur client
    if (clientPos) {
      markersRef.current.client = L.marker([clientPos.lat, clientPos.lng], { icon: makeIcon('🏠', '#D85A30') })
        .addTo(map).bindPopup(`<b>Destination</b><br>${clientPos.label || ''}`);
    }
    // Marqueur livreur
    if (livreurPos) {
      markersRef.current.livreur = L.marker([livreurPos.lat, livreurPos.lng], { icon: makeIcon('🛵', '#EF9F27') })
        .addTo(map).bindPopup('<b>Livreur</b><br>En route vers vous');
    }
    // Lieux sur la carte
    lieux.forEach(lieu => {
      if (lieu.lat && lieu.lng) {
        const ico = { market:'🏪', pharmacy:'💊', farm:'🌿', shop:'🏬', admin:'🏛', school:'🏫' };
        L.marker([lieu.lat, lieu.lng], { icon: makeIcon(ico[lieu.type] || '📍', '#94A3A0') })
          .addTo(map).bindPopup(`<b>${lieu.name}</b>${lieu.note ? `<br><small>${lieu.note}</small>` : ''}`);
      }
    });

    // Tracer la route vendeur → client
    if (vendorPos && clientPos) {
      L.polyline([[vendorPos.lat, vendorPos.lng], [clientPos.lat, clientPos.lng]], {
        color: '#1D9E75', weight: 3, opacity: 0.6, dashArray: '8, 6',
      }).addTo(map);
    }

    return () => { map.remove(); leafletRef.current = null; };
  }, []);

  // Mettre à jour la position du livreur en temps réel
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletRef.current || !livreurPos) return;
    const map = leafletRef.current;
    const makeIcon = (emoji, color) => L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;">${emoji}</div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    });
    if (markersRef.current.livreur) {
      markersRef.current.livreur.setLatLng([livreurPos.lat, livreurPos.lng]);
    } else {
      markersRef.current.livreur = L.marker([livreurPos.lat, livreurPos.lng], { icon: makeIcon('🛵', '#EF9F27') })
        .addTo(map).bindPopup('<b>Livreur</b><br>En route');
    }
  }, [livreurPos]);

  return (
    <div ref={mapRef} style={{ height, width:'100%', borderRadius:12, zIndex:1 }} />
  );
}