import { useState, useCallback } from "react";
import { Orders, Payments } from "../api/client";

export function useCart() {
  const [items, setItems]       = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const add = useCallback((product) => {
    setItems(c => ({ ...c, [product.id]: { ...(c[product.id] || { product, qty: 0 }), qty: (c[product.id]?.qty || 0) + 1 } }));
  }, []);

  const remove = useCallback((productId) => {
    setItems(c => {
      const n = { ...c };
      if (n[productId]?.qty > 1) n[productId] = { ...n[productId], qty: n[productId].qty - 1 };
      else delete n[productId];
      return n;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const total    = Object.values(items).reduce((s, { product, qty }) => s + product.price * qty, 0);
  const count    = Object.values(items).reduce((s, { qty }) => s + qty, 0);
  const cartItems = Object.values(items).map(({ product, qty }) => ({
    product_id: product.id, name: product.name, qty, price: product.price
  }));

  const checkout = useCallback(async ({ zone_id, delivery_addr, delivery_lat, delivery_lng, pay_method, notes }) => {
    setLoading(true); setError(null);
    try {
      const order = await Orders.create({
        items: cartItems, zone_id, delivery_addr,
        delivery_lat, delivery_lng, pay_method, notes
      });
      clear();

      // Si paiement en ligne → rediriger vers CinetPay
      if (pay_method !== "cash") {
        const { payment_url } = await Payments.initiate(order.order.id);
        window.location.href = payment_url;
      }

      return order.order;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cartItems, clear]);

  return { items, add, remove, clear, total, count, checkout, loading, error };
}