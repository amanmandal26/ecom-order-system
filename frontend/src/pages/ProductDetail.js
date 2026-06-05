import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoginPromptModal from '../components/LoginPromptModal';

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
];

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
  if (/toy|lego/.test(n))                                              return '🧸';
  if (/sport|fitness|gym/.test(n))                                     return '⚽';
  return '🛍️';
}

function getGradient(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function stockBadgeClass(qty) {
  if (qty === 0)   return 'badge badge-danger';
  if (qty <= 10)   return 'badge badge-warning';
  return 'badge badge-success';
}

function stockBadgeLabel(qty) {
  if (qty === 0)  return 'Out of Stock';
  if (qty <= 10)  return `Only ${qty} left!`;
  return `${qty} items in stock`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [product,        setProduct]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [quantity,       setQuantity]       = useState(1);
  const [addedToCart,    setAddedToCart]    = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isSeller = user?.role === 'SELLER';
  const isAdmin  = user?.role === 'ADMIN';

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/api/products/${id}`)
      .then(res => {
        setProduct(res.data.data);
        setQuantity(1);
      })
      .catch(err => {
        setError(
          err.response?.status === 404
            ? 'This product does not exist or has been removed.'
            : 'Failed to load product. Please try again.'
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, quantity });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    showToast(`${product.name} added to cart`);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-loading">⏳ Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Product not found</h3>
          <p>{error || 'This product could not be loaded.'}</p>
          <Link to="/products" className="btn btn-primary">← Back to Products</Link>
        </div>
      </div>
    );
  }

  const inStock = product.stockQuantity > 0;

  return (
    <div className="page">
      {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}

      {/* Breadcrumb */}
      <nav className="pd-breadcrumb">
        <Link to="/products">Products</Link>
        <span>›</span>
        <span>{product.name}</span>
      </nav>

      {/* Two-column layout */}
      <div className="pd-layout">

        {/* ── Left: image ─────────────────────────────────────────── */}
        <div>
          <div className="pd-image">
            <span className="pd-emoji">{getEmoji(product.name)}</span>
          </div>
        </div>

        {/* ── Right: info & actions ────────────────────────────────── */}
        <div className="pd-info">
          {product.sellerName && (
            <p className="pd-seller">🏪 Sold by <strong>{product.sellerName}</strong></p>
          )}

          <h1 className="pd-name">{product.name}</h1>

          <div className="pd-price">₹{Number(product.price).toFixed(2)}</div>

          <div style={{ marginBottom: '1.25rem' }}>
            <span className={stockBadgeClass(product.stockQuantity)}>
              {stockBadgeLabel(product.stockQuantity)}
            </span>
          </div>

          <hr className="pd-divider" />

          <div className="pd-description">
            <h3>About this product</h3>
            <p>{product.description || 'No description available.'}</p>
          </div>

          <hr className="pd-divider" />

          {/* Action area */}
          {isSeller || isAdmin ? (
            <div className="pd-role-notice">
              {isAdmin
                ? '🛡️ Admin accounts cannot purchase products'
                : '🏪 Use a customer account to purchase'}
            </div>
          ) : (
            <>
              {inStock && (
                <div className="pd-qty-row">
                  <span className="pd-qty-label">Quantity</span>
                  <div className="qty-controls">
                    <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                    <span className="qty-display">{quantity}</span>
                    <button className="qty-btn" onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))}>+</button>
                  </div>
                </div>
              )}

              <button
                className={`btn btn-full btn-lg ${addedToCart ? 'btn-success' : 'btn-primary'}`}
                onClick={addToCart}
                disabled={!inStock}
                style={{ marginBottom: '0.9rem' }}
              >
                {!inStock
                  ? 'Out of Stock'
                  : addedToCart
                    ? `✓ Added ${quantity > 1 ? quantity + 'x ' : ''}to Cart!`
                    : 'Add to Cart'}
              </button>
            </>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
              style={{ fontSize: '0.875rem' }}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Product Details card */}
      <div className="pd-meta-card">
        <h3>Product Details</h3>
        <div>
          <div className="pd-meta-row">
            <span className="pd-meta-label">Product ID</span>
            <span className="pd-meta-value">#{product.id}</span>
          </div>
          <div className="pd-meta-row">
            <span className="pd-meta-label">Added on</span>
            <span className="pd-meta-value">{formatDate(product.createdAt)}</span>
          </div>
          {product.sellerName && (
            <div className="pd-meta-row">
              <span className="pd-meta-label">Seller</span>
              <span className="pd-meta-value">{product.sellerName}</span>
            </div>
          )}
          {product.sellerEmail && (
            <div className="pd-meta-row">
              <span className="pd-meta-label">Seller Email</span>
              <span className="pd-meta-value">{product.sellerEmail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
