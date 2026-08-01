import { useEffect, useRef } from "react";
import { Livreurs } from "../api/client";

// Envoie la position GPS du livreur au serveur toutes les 10s
export function useLivreurGPS(enabled = false) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const sendPosition = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          Livreurs.updatePos(coords.latitude, coords.longitude)
            .catch(console.error);
        },
        (err) => console.warn("GPS:", err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    sendPosition(); // Immédiat
    intervalRef.current = setInterval(sendPosition, 10000); // Toutes les 10s

    return () => {
      clearInterval(intervalRef.current);
      // Passer hors ligne quand on quitte
      Livreurs.updatePos(0, 0).catch(() => {});
    };
  }, [enabled]);
}