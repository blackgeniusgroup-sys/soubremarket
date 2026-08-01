import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product, onAdd, compact = false }) {
  const nav = useNavigate();
  const fmt = n => Math.round(n).toLocaleString('fr-FR') + ' F';
  const p = product;

  return (
    <div className="card card-hover" style={{ padding:0, overflow:'hidden', cursor:'pointer', display:'flex', flexDirection:'column', position:'relative' }}
      onClick={() => nav(`/catalogue?product=${p.id}`)}>
      {p.featured && (
        <div style={{ position:'absolute', top:8, left:8, zIndex:2, background:'#D85A30', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:999, letterSpacing:0.5 }}>★ UNE</div>
      )}
      {p.stock < 5 && p.stock > 0 && (
        <div style={{ position:'absolute', top:8, right:8, zIndex:2, background:'#FFF8E1', color:'#E65100', fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:999 }}>⚠ Stock faible</div>
      )}
      {p.stock === 0 && (
        <div style={{ position:'absolute', top:8, right:8, zIndex:2, background:'#FCEBEB', color:'#A32D2D', fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:999 }}>Épuisé</div>
      )}
      {/* Image / Emoji */}
      <div style={{ height: compact ? 80 : 110, display:'flex', alignItems:'center', justifyContent:'center', fontSize: compact ? 32 : 42, background: p.featured ? '#E1F5EE' : '#F8FAFB', borderBottom:'1px solid #F1F5F4' }}>
        {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji || '📦'}
      </div>
      {/* Info */}
      <div style={{ padding: compact ? '8px 10px' : '12px 14px', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight:600, color:'#0D1F1B', lineHeight:1.3 }}>{p.name}</div>
        {!compact && <div style={{ fontSize:11, color:'#94A3A0' }}>🏪 {p.vendors?.shop_name || p.vendor}</div>}
        {p.rating > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ color:'#EF9F27', fontSize:11 }}>{'★'.repeat(Math.round(p.rating))}</span>
            <span style={{ fontSize:10, color:'#94A3A0' }}>({p.total_sales || p.sales || 0})</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:6 }}>
          <span style={{ fontSize: compact ? 13 : 15, fontWeight:700, color:'#0F6E56' }}>{fmt(p.price)}</span>
          {onAdd && p.stock > 0 && (
            <button onClick={e => { e.stopPropagation(); onAdd(p); }} style={{ width:30, height:30, borderRadius:8, background:'#1D9E75', color:'#fff', border:'none', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}
              onMouseOver={e => e.currentTarget.style.background='#0F6E56'} onMouseOut={e => e.currentTarget.style.background='#1D9E75'}>+</button>
          )}
        </div>
      </div>
    </div>
  );
}