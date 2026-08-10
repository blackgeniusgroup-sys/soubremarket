// Système de notifications toast global
// Usage avec contexte:
//   import Toast, { useToast } from '../components/Toast';
//   <Toast>...</Toast>
//   const { toast } = useToast();
//   toast.success("Article ajouté !")
// Usage simple:
//   <Toast message="Message" type="success" onClose={handleClose} />
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() { return useContext(ToastContext); }

let toastId = 0;

// Couleurs des différents types
const colors = {
  success: { bg:'#E8F5E9', color:'#2E7D32', border:'#4CAF50', icon:'✅' },
  error:   { bg:'#FCEBEB', color:'#A32D2D', border:'#D85A30', icon:'❌' },
  info:    { bg:'#E1F5EE', color:'#0F6E56', border:'#1D9E75', icon:'ℹ️' },
  warning: { bg:'#FFF8E1', color:'#E65100', border:'#FFA000', icon:'⚠️' },
};

// Composant interne pour afficher un toast
function ToastItem({ t, onClose }) {
  const c = colors[t.type] || colors.info;
  return (
    <div className="fade-in" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:10, padding:'11px 16px', fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', display:'flex', alignItems:'center', gap:10 }}>
      <span>{c.icon}</span>
      <span style={{ flex:1 }}>{t.msg}</span>
      {onClose && (
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:c.color, fontSize:16, lineHeight:1, padding:0, opacity:0.6 }}>✕</button>
      )}
    </div>
  );
}

export default function Toast({ children, message, type = 'success', onClose }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, toastType = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(p => [...p, { id, msg, type: toastType }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  };

  // Mode simple : afficher un toast unique avec message/type/onClose
  if (message !== undefined) {
    return (
      <div style={{ position:'fixed', top:70, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:320 }}>
        <ToastItem t={{ msg: message, type }} onClose={onClose} />
      </div>
    );
  }

  // Mode provider : fournir le contexte et afficher les toasts
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position:'fixed', top:70, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:320 }}>
        {toasts.map(t => (
          <ToastItem key={t.id} t={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}