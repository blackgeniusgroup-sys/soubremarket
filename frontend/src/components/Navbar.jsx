import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ROUTES = {
  client:  [['🏠','Accueil','/accueil'],['🛍️','Catalogue','/catalogue'],['🛒','Panier','/panier'],['📍','Suivi','/suivi']],
  vendor:  [['📊','Tableau de bord','/vendor'],['➕','Publier','/vendor/publier']],
  livreur: [['📦','Missions','/livreur'],['🛵','En cours','/livreur/en-cours']],
  admin:   [['📊','Dashboard','/admin'],['🛵','Livreurs','/admin/livreurs'],['⚙️','Paramètres','/admin/settings']],
  superadmin: [['📊','Dashboard','/admin'],['🛵','Livreurs','/admin/livreurs'],['⚙️','Paramètres','/admin/settings']],
};

export default function Navbar({ cartCount = 0, unread = 0, onNotif }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const routes = profile ? (ROUTES[profile.type] || []) : [];

  const handleLogout = async () => { await logout(); navigate('/'); };

  const roleColor = { client:'#1D9E75', vendor:'#2478D4', livreur:'#EF9F27', admin:'#7B52B5', superadmin:'#6D28D9' };

  return (
    <>
      {/* ── Desktop Navbar ── */}
      <nav className="top-nav-desktop" style={{ background:'#0F6E56', position:'sticky', top:0, zIndex:200, boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
        <div className="page-container" style={{ display:'flex', alignItems:'center', gap:24, height:60 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#fff' }}>Soubre<span style={{ color:'#9FE1CB' }}>Market</span></span>
          </Link>

          {/* Nav links */}
          {profile && (
            <div style={{ display:'flex', gap:4, flex:1 }}>
              {routes.map(([ico, label, path]) => (
                <Link key={path} to={path} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, color: pathname===path ? '#fff' : 'rgba(255,255,255,0.7)', background: pathname===path ? 'rgba(255,255,255,0.15)' : 'transparent', textDecoration:'none', transition:'all 0.2s' }}>
                  <span>{ico}</span><span className="hide-mobile">{label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto' }}>
            {profile?.type === 'client' && (
              <Link to="/panier" style={{ position:'relative', color:'#fff', textDecoration:'none', fontSize:20 }}>
                🛒
                {cartCount > 0 && <span style={{ position:'absolute', top:-6, right:-6, background:'#D85A30', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{cartCount}</span>}
              </Link>
            )}
            <button onClick={onNotif} style={{ position:'relative', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 10px', fontSize:18, cursor:'pointer', color:'#fff' }}>
              🔔
              {unread > 0 && <span style={{ position:'absolute', top:-4, right:-4, background:'#D85A30', color:'#fff', borderRadius:'50%', width:17, height:17, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{unread}</span>}
            </button>
            {profile ? (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{profile.name}</div>
                  <div style={{ fontSize:10, color:'#9FE1CB', textTransform:'capitalize' }}>{profile.type}</div>
                </div>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.1)' }}>Déconnexion</button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" style={{ background:'#fff', color:'#0F6E56' }}>Connexion</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation ── */}
      {profile && (
        <nav className="bottom-nav">
          <div className="bottom-nav-items">
            {routes.map(([ico, label, path]) => (
              <Link key={path} to={path} className={`bottom-nav-item ${pathname === path ? 'active' : ''}`}>
                <span className="nav-icon">{ico}</span>
                <span>{label}</span>
              </Link>
            ))}
            <button className="bottom-nav-item" onClick={handleLogout} style={{ border:'none', cursor:'pointer' }}>
              <span className="nav-icon">🚪</span>
              <span>Sortir</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}