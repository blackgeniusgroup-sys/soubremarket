import React from 'react';

const STATUS = {
  pending:    { label:'En attente',  bg:'#FAEEDA', color:'#854F0B' },
  assigned:   { label:'Assignée',    bg:'#E6F1FB', color:'#185FA5' },
  picked:     { label:'Récupérée',   bg:'#EDE7F6', color:'#5C3A8A' },
  delivering: { label:'En livraison',bg:'#E1F5EE', color:'#0F6E56' },
  delivered:  { label:'Livrée ✓',   bg:'#EAF3DE', color:'#27500A' },
  cancelled:  { label:'Annulée',     bg:'#FCEBEB', color:'#A32D2D' },
};

export default function OrderRow({ order, showClient = false, showLivreur = false, onClick }) {
  const s   = STATUS[order.status] || STATUS.pending;
  const fmt = n => Math.round(n).toLocaleString('fr-FR') + ' F';
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : order.date;

  return (
    <div onClick={onClick} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #F1F5F4', cursor:onClick?'pointer':'default', transition:'background 0.15s' }}
      onMouseOver={e => onClick && (e.currentTarget.style.background='#F8FAFB')} onMouseOut={e => (e.currentTarget.style.background='transparent')}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontSize:16 }}>{order.emoji || '📦'}</span>
          <span style={{ fontSize:13, fontWeight:600, color:'#0D1F1B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {order.order_number || order.id}
          </span>
        </div>
        <div style={{ fontSize:11, color:'#94A3A0' }}>
          {date}
          {showClient && order.client_name && ` · 👤 ${order.client_name}`}
          {showLivreur && order.livreur_name && ` · 🛵 ${order.livreur_name}`}
          {order.zone_name && ` · 📍 ${order.zone_name}`}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0, marginLeft:12 }}>
        <span style={{ background:s.bg, color:s.color, borderRadius:999, padding:'2px 10px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{s.label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#0F6E56' }}>{fmt(order.total)}</span>
      </div>
    </div>
  );
}