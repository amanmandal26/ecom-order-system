import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ── helpers ─────────────────────────────────────────────────────────── */
function getEmoji(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile|iphone|samsung|oneplus|oppo|vivo|pixel/.test(n)) return '📱';
  if (/laptop|macbook|dell|hp|lenovo|asus|notebook/.test(n))          return '💻';
  if (/tv|television|monitor|screen|display/.test(n))                  return '📺';
  if (/headphone|earphone|airpod|earbud|speaker|audio/.test(n))       return '🎧';
  if (/camera|dslr|gopro/.test(n))                                     return '📷';
  if (/watch|smartwatch/.test(n))                                      return '⌚';
  if (/keyboard|mouse|gaming/.test(n))                                 return '🎮';
  if (/shoe|boot|sneaker/.test(n))                                     return '👟';
  if (/shirt|tshirt|cloth|dress|jeans/.test(n))                       return '👕';
  if (/book|novel/.test(n))                                            return '📚';
  if (/bag|backpack|purse/.test(n))                                    return '👜';
  return '🛍️';
}

function getGradient(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile/.test(n))    return 'linear-gradient(135deg,#667eea,#764ba2)';
  if (/laptop|computer/.test(n)) return 'linear-gradient(135deg,#11998e,#38ef7d)';
  if (/headphone|audio/.test(n)) return 'linear-gradient(135deg,#f093fb,#f5576c)';
  if (/watch/.test(n))           return 'linear-gradient(135deg,#4facfe,#00f2fe)';
  if (/tv|television/.test(n))   return 'linear-gradient(135deg,#fa709a,#fee140)';
  if (/camera/.test(n))          return 'linear-gradient(135deg,#43e97b,#38f9d7)';
  return 'linear-gradient(135deg,#a18cd1,#fbc2eb)';
}

function fakeRating(id) {
  const x = (Math.sin(Number(id) * 127.1 + 311.7) + 1) / 2;
  return (3.5 + x * 1.4).toFixed(1);
}
function fakeReviews(id) {
  const x = (Math.sin(Number(id) * 311.7 + 127.1) + 1) / 2;
  return Math.floor(50 + x * 1950);
}
function fakeDiscount(id) {
  const x = (Math.sin(Number(id) * 211.3) + 1) / 2;
  return Math.floor(10 + x * 18);
}

/* ── constants ──────────────────────────────────────────────────────── */
const CATEGORIES = [
  { icon: '📱', label: 'Mobiles',     query: 'phone',     gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { icon: '👗', label: 'Fashion',     query: 'shirt',     gradient: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { icon: '💻', label: 'Electronics', query: 'laptop',    gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { icon: '🏠', label: 'Home',        query: 'home',      gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { icon: '🍳', label: 'Appliances',  query: 'appliance', gradient: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { icon: '🎮', label: 'Gaming',      query: 'gaming',    gradient: 'linear-gradient(135deg,#30cfd0,#330867)' },
  { icon: '📚', label: 'Books',       query: 'book',      gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
  { icon: '🎧', label: 'Audio',       query: 'headphone', gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
  { icon: '⌚', label: 'Watches',     query: 'watch',     gradient: 'linear-gradient(135deg,#2af598,#009efd)' },
  { icon: '👟', label: 'Footwear',    query: 'shoe',      gradient: 'linear-gradient(135deg,#96fbc4,#f9f586)' },
  { icon: '💄', label: 'Beauty',      query: 'beauty',    gradient: 'linear-gradient(135deg,#f77062,#fe5196)' },
  { icon: '🧸', label: 'Toys',        query: 'toy',       gradient: 'linear-gradient(135deg,#c471f5,#fa71cd)' },
];

const BRANDS = ['Apple', 'Samsung', 'Sony', 'OnePlus', 'HP', 'boAt'];

const STATS = [
  { icon: '🛍️', value: 10000, suffix: '+',  display: '10K+', label: 'Products'       },
  { icon: '🚚', value: null,   suffix: '',   display: 'FREE', label: 'Shipping'       },
  { icon: '🔒', value: 100,    suffix: '%',  display: '100%', label: 'Secure Payment' },
  { icon: '⭐', value: 4.8,    suffix: '',   display: '4.8',  label: 'Rating'         },
  { icon: '🏪', value: 500,    suffix: '+',  display: '500+', label: 'Sellers'        },
];

/* ── count-up hook ──────────────────────────────────────────────────── */
function useCountUp(target, duration, started) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started || target === null) return;
    let frame = 0;
    const totalFrames = duration / 16;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      if (progress >= 1) { setCount(target); clearInterval(timer); }
      else {
        const cur = target * eased;
        setCount(Number.isInteger(target) ? Math.floor(cur) : Math.round(cur * 10) / 10);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return count;
}

/* ── countdown hook ─────────────────────────────────────────────────── */
function useCountdown(initial = 5 * 3600 + 23 * 60 + 41) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return { h, m, s };
}

/* ── animated stat ──────────────────────────────────────────────────── */
function AnimatedStat({ stat, started }) {
  const count = useCountUp(stat.value, 1400, started);
  if (stat.value === null) return <>{stat.display}</>;
  if (!started) return <>0{stat.suffix}</>;
  if (stat.value < 100) return <>{count}{stat.suffix}</>;
  return <>{(count >= 1000 ? Math.floor(count / 1000) + 'K' : count)}{stat.suffix}</>;
}

/* ── component ──────────────────────────────────────────────────────── */
export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  const countdown = useCountdown();

  useEffect(() => {
    api.get('/api/products?size=8&sortBy=createdAt&sortDir=desc&inStockOnly=false')
      .then(res => setProducts(res.data.data?.content || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>

      {/* ── Announcement Banner ─────────────────────────────────────── */}
      <div className="announcement-bar">
        <div className="announcement-track">
          <span>🔥 MEGA SALE — Up to 70% off</span>
          <span className="announcement-sep">|</span>
          <span>🚚 Free Delivery on orders above ₹499</span>
          <span className="announcement-sep">|</span>
          <span>💰 Use code ECOM50 for extra 50% off</span>
          <span className="announcement-sep">|</span>
          <span>🔥 MEGA SALE — Up to 70% off</span>
          <span className="announcement-sep">|</span>
          <span>🚚 Free Delivery on orders above ₹499</span>
          <span className="announcement-sep">|</span>
          <span>💰 Use code ECOM50 for extra 50% off</span>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-badge">🚀 New Arrivals Every Day</div>
          <h1>
            Shop Smarter,<br />
            <span className="hero-live-better">Live Better</span>
          </h1>
          <p className="hero-sub">
            Millions of products from verified sellers. Best prices guaranteed, every single day.
          </p>
          <div className="hero-ctas">
            <Link to="/products" className="hero-btn-white">Shop Now →</Link>
            <Link to="/seller-register" className="hero-btn-outline">Sell With Us →</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-float-card hero-float-card-blue">
            📱 Latest Phones<br />
            <strong>Starting ₹9,999</strong>
          </div>
          <div className="hero-float-card hero-float-card-green">
            💻 Laptops &amp; PCs<br />
            <strong>Starting ₹29,999</strong>
          </div>
          <div className="hero-float-card hero-float-card-orange">
            🎧 Audio Gear<br />
            <strong>Starting ₹999</strong>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────────── */}
      <div className="stats-bar" ref={statsRef}>
        {STATS.map(s => (
          <div key={s.label} className="stats-bar-item">
            <span className="stats-bar-icon">{s.icon}</span>
            <span className="stats-bar-value">
              <AnimatedStat stat={s} started={statsVisible} />
            </span>
            <span className="stats-bar-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Shop by Category ─────────────────────────────────────────── */}
      <div className="landing-section">
        <div className="landing-section-header">
          <div className="section-header-bar"><h2>Shop by Category</h2></div>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map(c => (
            <div
              key={c.label}
              className="cat-card cat-card-gradient"
              style={{ background: c.gradient }}
              onClick={() => navigate(`/products?search=${encodeURIComponent(c.query)}`)}
            >
              <span className="cat-card-icon" style={{ fontSize: 40 }}>{c.icon}</span>
              <span className="cat-card-label" style={{ color: '#fff', fontWeight: 700 }}>{c.label}</span>
              <span className="cat-shop-now">Shop Now →</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Deals of the Day ─────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="deals-section">
          <div className="deals-header">
            <div className="deals-header-title">⚡ Deals of the Day</div>
            <div className="deals-timer">
              Ends in:&nbsp;
              <span className="timer-block">{countdown.h}</span>
              <span className="timer-sep">:</span>
              <span className="timer-block">{countdown.m}</span>
              <span className="timer-sep">:</span>
              <span className="timer-block">{countdown.s}</span>
            </div>
          </div>
          <div className="deals-products">
            {products.slice(0, 4).map(p => {
              const disc = fakeDiscount(p.id);
              const mrp  = Math.floor(p.price * (1 + disc / 100));
              return (
                <div
                  key={p.id}
                  className="deal-card"
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div className="deal-card-img" style={{ background: p.imageUrls?.length > 0 ? '#f0f0f0' : getGradient(p.name), position: 'relative' }}>
                    {p.imageUrls?.length > 0 ? (
                      <img
                        src={p.imageUrls[0]}
                        alt={p.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0, transition: 'opacity 0.3s' }}
                        onLoad={e => { e.currentTarget.style.opacity = 1; }}
                      />
                    ) : (
                      <span>{getEmoji(p.name)}</span>
                    )}
                    <span className="deal-discount-badge">-{disc}%</span>
                  </div>
                  <div className="deal-card-body">
                    <div className="deal-name">{p.name}</div>
                    <div className="deal-price-row">
                      <span className="deal-price">₹{Number(p.price).toLocaleString('en-IN')}</span>
                      <span className="deal-mrp">₹{Number(mrp).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top Brands ───────────────────────────────────────────────── */}
      <div className="brands-section">
        <div className="section-header-bar brands-section-title">
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-dark)' }}>Shop by Brand</span>
        </div>
        <div className="brands-grid">
          {BRANDS.map(b => (
            <div key={b} className="brand-card">{b}</div>
          ))}
        </div>
      </div>

      {/* ── Featured Products ─────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="landing-section" style={{ background: 'var(--bg)' }}>
          <div className="landing-section-header">
            <div className="section-header-bar">
              <h2>Featured Products</h2>
            </div>
            <Link to="/products" className="landing-see-all">View All →</Link>
          </div>
          <div className="p-grid-landing">
            {products.map((p, idx) => {
              const disc    = fakeDiscount(p.id);
              const mrp     = Math.floor(p.price * (1 + disc / 100));
              const rating  = fakeRating(p.id);
              const reviews = fakeReviews(p.id);
              const isHot   = idx < 2;
              const isNew   = idx >= 2 && idx < 4;
              return (
                <div
                  key={p.id}
                  className="p-card"
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div
                    className="p-card-img"
                    style={{ background: p.imageUrls?.length > 0 ? '#f0f0f0' : getGradient(p.name) }}
                  >
                    {isHot && <span className="p-card-hot">HOT</span>}
                    {isNew && !isHot && <span className="p-card-new">NEW</span>}
                    {p.imageUrls?.length > 0 ? (
                      <img
                        src={p.imageUrls[0]}
                        alt={p.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.3s' }}
                        onLoad={e => { e.currentTarget.style.opacity = 1; }}
                      />
                    ) : (
                      <span className="p-card-emoji">{getEmoji(p.name)}</span>
                    )}
                    <span className={`p-card-stock badge ${
                      p.stockQuantity === 0 ? 'badge-danger'
                      : p.stockQuantity <= 10 ? 'badge-warning'
                      : 'badge-success'
                    }`}>
                      {p.stockQuantity === 0 ? 'Out of Stock'
                        : p.stockQuantity <= 10 ? `Only ${p.stockQuantity} left`
                        : 'In Stock'}
                    </span>
                    <div className="p-card-img-overlay">
                      <button
                        className="p-card-quick-view-btn"
                        onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}`); }}
                      >
                        👁 Quick View
                      </button>
                    </div>
                    <button className="p-card-wishlist" onClick={e => e.stopPropagation()}>♡</button>
                  </div>
                  <div className="p-card-body">
                    {p.sellerName && <div className="p-card-seller">🏪 {p.sellerName}</div>}
                    <div className="p-card-name">{p.name}</div>
                    <div className="p-card-desc">{p.description}</div>
                    <div className="p-card-rating">
                      ⭐ {rating} <span style={{ color: 'var(--text-light)' }}>({reviews.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="p-card-price-row">
                      <span className="p-card-price">₹{Number(p.price).toLocaleString('en-IN')}</span>
                      <span className="p-card-mrp">₹{Number(mrp).toLocaleString('en-IN')}</span>
                      <span className="p-card-off">{disc}% off</span>
                    </div>
                  </div>
                  <button
                    className="p-card-btn"
                    disabled={p.stockQuantity === 0}
                    onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}`); }}
                  >
                    {p.stockQuantity === 0 ? 'OUT OF STOCK' : 'VIEW DETAILS'}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/products" className="btn btn-primary btn-lg">Browse All Products →</Link>
          </div>
        </div>
      )}

      {/* ── Sell Banner ──────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="sell-banner">
          <h2>Start Selling on EcomShop</h2>
          <p>Join 500+ sellers and reach millions of customers. Simple setup, zero hidden fees.</p>
          <Link to="/seller-register" className="hero-btn-white">Become a Seller →</Link>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="landing-footer">

        {/* Newsletter */}
        <div className="footer-newsletter">
          <h3>📧 Stay Updated with Best Deals</h3>
          <p>Subscribe to get exclusive offers, new arrivals and sale alerts</p>
          <form className="newsletter-form" onSubmit={e => e.preventDefault()}>
            <input
              className="newsletter-input"
              type="email"
              placeholder="Enter your email address"
            />
            <button className="newsletter-btn" type="submit">SUBSCRIBE</button>
          </form>
        </div>

        {/* Links */}
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>🛍️ EcomShop</span>
            <p>India's most trusted online marketplace. Quality products from verified sellers, delivered fast.</p>
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
            <div>
              <strong>Help</strong>
              <Link to="/products">Customer Support</Link>
              <Link to="/products">Return Policy</Link>
              <Link to="/products">Terms of Service</Link>
              <Link to="/products">Privacy Policy</Link>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="landing-footer-bottom">
          <div className="footer-bottom-row">
            <div className="footer-social">
              <a href="#!" className="footer-social-btn" title="Facebook">📘</a>
              <a href="#!" className="footer-social-btn" title="Twitter">🐦</a>
              <a href="#!" className="footer-social-btn" title="Instagram">📸</a>
              <a href="#!" className="footer-social-btn" title="LinkedIn">💼</a>
            </div>
            <span>© 2026 EcomShop · Made with ❤️ in India · Built with Spring Boot &amp; React</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
