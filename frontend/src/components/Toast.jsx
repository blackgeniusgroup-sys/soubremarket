// Système de notifications toast global
// Usage: import { useToast } from '../components/Toast';
//        const { toast } = useToast();
//        toast.success("Article ajouté !")
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() { return useContext(ToastContext); }

let toastId = 0;

export default function Toast({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  };

  const colors = {
    success: { bg:'#E8F5E9', color:'#2E7D32', border:'#4CAF50', icon:'✅' },
    error:   { bg:'#FCEBEB', color:'#A32D2D', border:'#D85A30', icon:'❌' },
    info:    { bg:'#E1F5EE', color:'#0F6E56', border:'#1D9E75', icon:'ℹ️' },
    warning: { bg:'#FFF8E1', color:'#E65100', border:'#FFA000', icon:'⚠️' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position:'fixed', top:70, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:320 }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} className="fade-in" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:10, padding:'11px 16px', fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', display:'flex', alignItems:'center', gap:10 }}>
              <span>{c.icon}</span>
              <span style={{ flex:1 }}>{t.msg}</span>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} style={{ background:'none', border:'none', cursor:'pointer', color:c.color, fontSize:16, lineHeight:1, padding:0, opacity:0.6 }}>✕</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}