import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

function getCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

const CATEGORIES = [
  { icon: '⭐', label: 'For You',      query: ''          },
  { icon: '📱', label: 'Mobiles',      query: 'phone'     },
  { icon: '👗', label: 'Fashion',      query: 'shirt'     },
  { icon: '💄', label: 'Beauty',       query: 'beauty'    },
  { icon: '💻', label: 'Electronics',  query: 'laptop'    },
  { icon: '🏠', label: 'Home',         query: 'home'      },
  { icon: '🍳', label: 'Appliances',   query: 'appliance' },
  { icon: '🎮', label: 'Gaming',       query: 'gaming'    },
  { icon: '📚', label: 'Books',        query: 'book'      },
  { icon: '🎧', label: 'Audio',        query: 'headphone' },
  { icon: '⌚', label: 'Watches',      query: 'watch'     },
  { icon: '👟', label: 'Footwear',     query: 'shoe'      },
];

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [cartCount, setCartCount]     = useState(getCartCount());
  const [cartBounce, setCartBounce]   = useState(false);
  const prevCountRef = useRef(cartCount);

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    window.addEventListener('cartUpdated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cartUpdated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 600);
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const showCart   = !isAuthenticated || user?.role === 'CUSTOMER';
  const showSeller = !isAuthenticated || user?.role === 'CUSTOMER';

  return (
    <nav className="navbar">

      {/* ── Row 1: main bar ──────────────────────────────────────────── */}
      <div className="navbar-top">
        <Link to="/" className="navbar-brand">🛍️ EcomShop</Link>

        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products, brands and more..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="navbar-search-btn" aria-label="Search">
            🔍
          </button>
        </form>

        <div className="navbar-actions">
          <UserAvatar />

          {!isAuthenticated && (
            <>
              <Link to="/login"    className="navbar-auth-btn navbar-auth-outline">Sign In</Link>
              <Link to="/register" className="navbar-auth-btn navbar-auth-filled">Register</Link>
            </>
          )}

          {showSeller && (
            <Link to="/seller-register" className="navbar-action-link">
              Become a Seller
            </Link>
          )}

          {showCart && (
            <Link
              to={isAuthenticated ? '/cart' : '/login'}
              className="navbar-cart-btn"
            >
              <span className="navbar-cart-icon">🛒</span>
              <span>Cart</span>
              {cartCount > 0 && (
                <span className={`cart-badge${cartBounce ? ' cart-badge-bounce' : ''}`}>{cartCount}</span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 2: category bar ──────────────────────────────────────── */}
      <div className="navbar-cats">
        {CATEGORIES.map(c => (
          <button
            key={c.label}
            className="navbar-cat-btn"
            onClick={() => navigate(c.query ? `/products?search=${encodeURIComponent(c.query)}` : '/products')}
          >
            <span className="navbar-cat-icon">{c.icon}</span>
            <span className="navbar-cat-label">{c.label}</span>
          </button>
        ))}
      </div>

    </nav>
  );
}
