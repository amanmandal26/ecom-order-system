import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleBadgeClass(role) {
  if (role === 'SELLER') return 'badge badge-info';
  if (role === 'ADMIN')  return 'badge badge-danger';
  return 'badge badge-success';
}

function roleBadgeLabel(role) {
  if (role === 'SELLER') return '🏪 Seller';
  if (role === 'ADMIN')  return '⚙️ Admin';
  return '👤 Customer';
}

function formatMemberSince(dateStr) {
  if (!dateStr) return 'EcomShop Member';
  try {
    return 'Member since ' + new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch { return 'EcomShop Member'; }
}

export default function UserAvatar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const close = () => setOpen(false);

  const handleLogout = () => {
    close();
    logout();
    navigate('/login');
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const firstName = user?.name?.split(' ')[0] || 'Account';

  return (
    <div className="nav-account" ref={dropdownRef}>
      <button className="nav-account-btn" onClick={() => setOpen(o => !o)}>
        {isAuthenticated ? (
          <div className="nav-avatar-circle">{initial}</div>
        ) : (
          <span style={{ fontSize: 16 }}>👤</span>
        )}
        <span className="nav-account-label" style={{ fontSize: 13, fontWeight: 600 }}>
          {isAuthenticated ? firstName : 'Login'}
        </span>
        <span className="nav-account-arrow">▾</span>
      </button>

      {open && (
        <div className="nav-account-dropdown">
          {!isAuthenticated ? (
            <>
              <div className="nav-dd-signup">
                New Customer?{' '}
                <Link to="/register" onClick={close} className="nav-dd-signup-link">Sign Up</Link>
              </div>
              <div className="nav-dd-divider" />
              <Link to="/login" className="nav-dd-item" onClick={close}>👤 My Profile</Link>
              <Link to="/login" className="nav-dd-item" onClick={close}>📦 Orders</Link>
              <Link to="/login" className="nav-dd-item" onClick={close}>❤️ Wishlist</Link>
            </>
          ) : (
            <>
              <div className="nav-dd-header">
                <div className="nav-dd-name">{user.name}</div>
                <div className="nav-dd-email">{user.email}</div>
              </div>
              <div className="nav-dd-divider" />
              <div className="nav-dd-role">
                <span className={roleBadgeClass(user.role)}>{roleBadgeLabel(user.role)}</span>
              </div>
              <div className="nav-dd-divider" />
              {user.role === 'CUSTOMER' && (
                <>
                  <Link to="/cart"   className="nav-dd-item" onClick={close}>🛒 My Cart</Link>
                  <Link to="/orders" className="nav-dd-item" onClick={close}>📦 My Orders</Link>
                </>
              )}
              {user.role === 'SELLER' && (
                <Link to="/seller-dashboard" className="nav-dd-item" onClick={close}>🏪 Seller Dashboard</Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="nav-dd-item" onClick={close}>⚙️ Admin Panel</Link>
              )}
              <div className="nav-dd-divider" />
              <button className="nav-dd-item nav-dd-logout" onClick={handleLogout}>
                🚪 Logout
              </button>
              <div className="nav-dd-since">{formatMemberSince(user.createdAt)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
