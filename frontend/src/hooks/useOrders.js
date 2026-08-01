import { useState, useEffect, useCallback } from "react";
import { Orders } from "../api/client";
import { createClient } from "@supabase/supabase-js";

// Client Supabase PUBLIC (lecture seule, pour le Realtime)
// Utilisez la clé ANON (publique), pas la Service Key !
const supabasePublic = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export function useOrders(params = {}) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Orders.list(params);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

// Hook de suivi temps réel d'une commande via Supabase Realtime
export function useOrderTracking(orderId) {
  const [order, setOrder]           = useState(null);
  const [livreurPos, setLivreurPos] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    // Charger la commande via le serveur
    Orders.get(orderId).then(setOrder).catch(console.error);

    // Abonnement Realtime : mise à jour du statut de la commande
    const orderSub = supabasePublic
      .channel(`order:${orderId}`)
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabasePublic.removeChannel(orderSub); };
  }, [orderId]);

  // Abonnement Realtime : position GPS du livreur
  useEffect(() => {
    if (!order?.livreur_id) return;

    const livreurSub = supabasePublic
      .channel(`livreur:${order.livreur_id}`)
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "livreurs",
        filter: `id=eq.${order.livreur_id}`,
      }, (payload) => {
        if (payload.new.current_lat && payload.new.current_lng) {
          setLivreurPos({ lat: payload.new.current_lat, lng: payload.new.current_lng });
        }
      })
      .subscribe();

    return () => { supabasePublic.removeChannel(livreurSub); };
  }, [order?.livreur_id]);

  return { order, livreurPos };
}