import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Toast from './components/Toast';

// Lazy loading des pages
const Landing       = lazy(() => import('./pages/Landing'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));

// Client
const ClientHome    = lazy(() => import('./pages/client/Home'));
const Catalogue     = lazy(() => import('./pages/client/Catalogue'));
const Panier        = lazy(() => import('./pages/client/Panier'));
const Suivi         = lazy(() => import('./pages/client/Suivi'));

// Vendor
const VendorDash    = lazy(() => import('./pages/vendor/Dashboard'));
const Publier       = lazy(() => import('./pages/vendor/Publier'));

// Livreur
const Missions      = lazy(() => import('./pages/livreur/Missions'));
const EnCours       = lazy(() => import('./pages/livreur/EnCours'));

// Admin
const AdminDash     = lazy(() => import('./pages/admin/Dashboard'));
const AdminLivreurs = lazy(() => import('./pages/admin/Livreurs'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Loader global
function PageLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8faf9' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🛍️</div>
        <div style={{ fontSize:14, color:'#0F6E56', fontWeight:500 }}>Chargement de SoubreMarket...</div>
        <div style={{ width:40, height:3, background:'#1D9E75', borderRadius:2, margin:'12px auto 0', animation:'grow 1s ease infinite alternate' }} />
      </div>
    </div>
  );
}

// Route protégée
function PrivateRoute({ children, roles }) {
  const { profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.type)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"          element={<Landing />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />

          {/* Client */}
          <Route path="/accueil"   element={<PrivateRoute roles={['client']}><ClientHome /></PrivateRoute>} />
          <Route path="/catalogue" element={<PrivateRoute roles={['client']}><Catalogue /></PrivateRoute>} />
          <Route path="/panier"    element={<PrivateRoute roles={['client']}><Panier /></PrivateRoute>} />
          <Route path="/suivi"     element={<PrivateRoute roles={['client']}><Suivi /></PrivateRoute>} />

          {/* Vendor */}
          <Route path="/vendor"    element={<PrivateRoute roles={['vendor']}><VendorDash /></PrivateRoute>} />
          <Route path="/vendor/publier" element={<PrivateRoute roles={['vendor']}><Publier /></PrivateRoute>} />

          {/* Livreur */}
          <Route path="/livreur"          element={<PrivateRoute roles={['livreur']}><Missions /></PrivateRoute>} />
          <Route path="/livreur/en-cours" element={<PrivateRoute roles={['livreur']}><EnCours /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin"             element={<PrivateRoute roles={['admin']}><AdminDash /></PrivateRoute>} />
          <Route path="/admin/livreurs"    element={<PrivateRoute roles={['admin']}><AdminLivreurs /></PrivateRoute>} />
          <Route path="/admin/settings"    element={<PrivateRoute roles={['admin']}><AdminSettings /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}