import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(getCartCount());

  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount());
    window.addEventListener('cartUpdated', updateCount);
    // Also refresh on storage changes from other tabs
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('cartUpdated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to={isAuthenticated ? '/products' : '/login'} className="navbar-brand">
        EcomShop
      </Link>

      {isAuthenticated && (
        <div className="navbar-links">
          <Link to="/products">Products</Link>
          <Link to="/cart" className="cart-link">
            Cart
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link to="/orders">My Orders</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin">Admin Panel</Link>
          )}
          {user?.role === 'SELLER' && (
            <Link to="/seller-dashboard">Seller Dashboard</Link>
          )}
        </div>
      )}

      <div className="navbar-right">
        {isAuthenticated ? (
          <>
            <span className="navbar-user">Hi, {user?.name?.split(' ')[0]}</span>
            <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
