import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Abonnement Realtime aux nouvelles notifications
    const sub = supabasePublic
      .channel(`notifications:${userId}`)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new;
        setNotifications(prev => [n, ...prev]);
        setUnreadCount(c => c + 1);
        // Notification navigateur (si permission accordée)
        if (Notification.permission === "granted") {
          new Notification(n.title, { body: n.message, icon: "/logo192.png" });
        }
      })
      .subscribe();

    return () => supabasePublic.removeChannel(sub);
  }, [userId]);

  const markAllRead = () => setUnreadCount(0);
  return { notifications, unreadCount, markAllRead };
}