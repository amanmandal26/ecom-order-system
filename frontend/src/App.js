import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import SellerRegister from './pages/SellerRegister';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Landing from './pages/Landing';
import ProductDetail from './pages/ProductDetail';
import PaymentSuccess from './pages/PaymentSuccess';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/products" replace />;
  return children;
}

function SellerRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.role !== 'SELLER') return <Navigate to="/products" replace />;
  return children;
}

// Only CUSTOMERs can access cart and orders — ADMIN and SELLER are redirected to their home screens
function CustomerRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.role === 'ADMIN')  return <Navigate to="/admin"              replace />;
  if (user?.role === 'SELLER') return <Navigate to="/seller-dashboard"   replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/seller-register" element={<SellerRegister />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
        <Route path="/orders" element={<CustomerRoute><Orders /></CustomerRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/seller-dashboard" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
        <Route path="/payment-success" element={<CustomerRoute><PaymentSuccess /></CustomerRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
