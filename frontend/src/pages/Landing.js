import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const GRADIENTS_UNUSED = null; // product cards use gray bg now

function getEmoji(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile|iphone|samsung|oneplus|oppo|vivo|pixel/.test(n)) return '📱';
  if (/laptop|macbook|dell|hp|lenovo|asus|notebook/.test(n))          return '💻';
  if (/tv|television|monitor|screen|display/.test(n))                  return '📺';
  if (/headphone|earphone|airpod|earbud|speaker|audio/.test(n))       return '🎧';
  if (/camera|dslr|gopro/.test(n))                                     return '📷';
  if (/watch|smartwatch/.test(n))                                      return '⌚';
  if (/tablet|ipad/.test(n))                                           return '📱';
  if (/keyboard|mouse|gaming/.test(n))                                 return '🎮';
  if (/shoe|boot|sneaker/.test(n))                                     return '👟';
  if (/shirt|tshirt|cloth|dress|jeans/.test(n))                       return '👕';
  if (/book|novel/.test(n))                                            return '📚';
  if (/bag|backpack|purse/.test(n))                                    return '👜';
  return '🛍️';
}

const CATEGORIES = [
  { icon: '📱', label: 'Mobiles',      query: 'phone'     },
  { icon: '👗', label: 'Fashion',      query: 'shirt'     },
  { icon: '💻', label: 'Electronics',  query: 'laptop'    },
  { icon: '🏠', label: 'Home',         query: 'home'      },
  { icon: '🍳', label: 'Appliances',   query: 'appliance' },
  { icon: '🎮', label: 'Gaming',       query: 'gaming'    },
  { icon: '📚', label: 'Books',        query: 'book'      },
  { icon: '🎧', label: 'Audio',        query: 'headphone' },
  { icon: '⌚', label: 'Watches',      query: 'watch'     },
  { icon: '👟', label: 'Footwear',     query: 'shoe'      },
  { icon: '💄', label: 'Beauty',       query: 'beauty'    },
  { icon: '🧸', label: 'Toys',         query: 'toy'       },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/api/products?size=8&sortBy=createdAt&sortDir=desc&inStockOnly=false')
      .then(res => setProducts(res.data.data?.content || []))
      .catch(() => {});
  }, []);

  return (
    <div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-badge">🚀 New Arrivals Every Day</div>
          <h1>India's Most Trusted<br />Online Marketplace</h1>
          <p className="hero-sub">
            Millions of products. Verified sellers. Best prices guaranteed.
          </p>
          <div className="hero-ctas">
            <Link to="/products" className="hero-btn-white">Shop Now</Link>
            {!isAuthenticated && (
              <Link to="/seller-register" className="hero-btn-outline">Sell With Us</Link>
            )}
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-float-card">📱 Latest Phones<br /><strong>Starting ₹9,999</strong></div>
          <div className="hero-float-card">💻 Laptops &amp; PCs<br /><strong>Starting ₹29,999</strong></div>
          <div className="hero-float-card">🎧 Audio Gear<br /><strong>Starting ₹999</strong></div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="stats-bar">
        {[
          { icon: '🛍️', value: '10K+', label: 'Products'       },
          { icon: '🚚', value: 'FREE',  label: 'Shipping'       },
          { icon: '🔒', value: '100%',  label: 'Secure Payment' },
          { icon: '🏪', value: '500+',  label: 'Verified Sellers'},
        ].map(s => (
          <div key={s.label} className="stats-bar-item">
            <span className="stats-bar-icon">{s.icon}</span>
            <span className="stats-bar-value">{s.value}</span>
            <span className="stats-bar-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Shop by Category ──────────────────────────────────────────── */}
      <div className="landing-section">
        <h2>Shop by Category</h2>
        <div className="cat-grid">
          {CATEGORIES.map(c => (
            <div
              key={c.label}
              className="cat-card"
              onClick={() => navigate(`/products?search=${encodeURIComponent(c.query)}`)}
            >
              <span className="cat-card-icon">{c.icon}</span>
              <span className="cat-card-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Products ──────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="landing-section">
          <div className="landing-section-header">
            <h2>Featured Products</h2>
            <Link to="/products" className="landing-see-all">View All →</Link>
          </div>
          <div className="p-grid-landing">
            {products.map(p => (
              <div
                key={p.id}
                className="p-card"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                <div className="p-card-img">
                  {getEmoji(p.name)}
                  <span
                    className={`p-card-stock badge ${p.stockQuantity === 0 ? 'badge-danger' : p.stockQuantity <= 10 ? 'badge-warning' : 'badge-success'}`}
                  >
                    {p.stockQuantity === 0 ? 'Out of Stock' : p.stockQuantity <= 10 ? `Only ${p.stockQuantity} left` : 'In Stock'}
                  </span>
                </div>
                <div className="p-card-body">
                  <div className="p-card-name">{p.name}</div>
                  <div className="p-card-desc">{p.description}</div>
                  {p.sellerName && <div className="p-card-seller">⭐ {p.sellerName}</div>}
                  <div className="p-card-price">₹{Number(p.price).toFixed(2)}</div>
                </div>
                <button
                  className="p-card-btn"
                  disabled={p.stockQuantity === 0}
                  onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}`); }}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/products" className="btn btn-primary">Browse All Products</Link>
          </div>
        </div>
      )}

      {/* ── Sell Banner ────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="sell-banner">
          <h2>Start Selling on EcomShop</h2>
          <p>Join 500+ sellers and reach millions of customers. Simple setup, zero fees.</p>
          <Link to="/seller-register" className="hero-btn-white">Become a Seller →</Link>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontStyle: 'italic' }}>EcomShop</span>
            <p>India's most trusted online marketplace. Quality products from verified sellers.</p>
          </div>
          <div className="landing-footer-links">
            <div>
              <strong>Shop</strong>
              <Link to="/products">All Products</Link>
              {CATEGORIES.slice(0, 5).map(c => (
                <Link key={c.label} to={`/products?search=${c.query}`}>{c.label}</Link>
              ))}
            </div>
            <div>
              <strong>Account</strong>
              {isAuthenticated ? (
                <Link to="/products">Browse Products</Link>
              ) : (
                <>
                  <Link to="/login">Sign In</Link>
                  <Link to="/register">Create Account</Link>
                </>
              )}
              <Link to="/seller-register">Sell on EcomShop</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          © 2024 EcomShop. Built with Spring Boot &amp; React microservices.
        </div>
      </footer>

    </div>
  );
}
