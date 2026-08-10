import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Toast from './components/Toast';

// Lazy loading des pages
const Landing       = lazy(() => import('./pages/Landing'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));

// Client
const ClientHome    = lazy(() => import('./pages/client/CustomerSpace'));
const Catalogue     = lazy(() => import('./pages/client/Catalogue'));
const Panier        = lazy(() => import('./pages/client/Panier'));
const Suivi         = lazy(() => import('./pages/client/Suivi'));

// Vendor
const VendorDash    = lazy(() => import('./pages/vendor/SellerSpace'));
const Publier       = lazy(() => import('./pages/vendor/Publier'));

// Livreur
const Missions      = lazy(() => import('./pages/livreur/Missions'));
const EnCours       = lazy(() => import('./pages/livreur/EnCours'));

// Admin
const AdminDash     = lazy(() => import('./pages/admin/Dashboard'));
const AdminLivreurs = lazy(() => import('./pages/admin/Livreurs'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Superadmin
const SuperAdminLayout = lazy(() => import('./components/admin/SuperAdminLayout'));
const SuperOverview     = lazy(() => import('./pages/superadmin/Overview'));
const SuperVendeurs     = lazy(() => import('./pages/superadmin/Vendeurs'));
const SuperProduits     = lazy(() => import('./pages/superadmin/Produits'));
const SuperCommandes    = lazy(() => import('./pages/superadmin/Commandes'));
const SuperFinances     = lazy(() => import('./pages/superadmin/Finances'));
const SuperModeration   = lazy(() => import('./pages/superadmin/Moderation'));

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
    <Toast>
      <BrowserRouter>
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

          {/* Admin — utilise le même layout que le superadmin (Header + Sidebar) */}
          <Route path="/admin"             element={<PrivateRoute roles={['admin']}><SuperAdminLayout /></PrivateRoute>}>
            <Route index element={<AdminDash />} />
            <Route path="vendeurs" element={<AdminDash initialTab="vendors" />} />
            <Route path="clients" element={<AdminDash initialTab="clients" />} />
            <Route path="livreurs" element={<AdminLivreurs />} />
            <Route path="produits" element={<AdminDash initialTab="products" />} />
            <Route path="litiges" element={<AdminDash initialTab="orders" />} />
            <Route path="admins" element={<AdminDash initialTab="admins" />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Superadmin */}
          <Route path="/superadmin" element={<PrivateRoute roles={['superadmin']}><SuperAdminLayout /></PrivateRoute>}>
            <Route index element={<SuperOverview />} />
            <Route path="vendeurs" element={<SuperVendeurs />} />
            <Route path="clients" element={<AdminDash initialTab="clients" />} />
            <Route path="livreurs" element={<AdminDash initialTab="livreurs" />} />
            <Route path="admins" element={<AdminDash initialTab="admins" />} />
            <Route path="produits" element={<SuperProduits />} />
            <Route path="commandes" element={<SuperCommandes />} />
            <Route path="finances" element={<SuperFinances />} />
            <Route path="moderation" element={<SuperModeration />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Toast>
  );
}
