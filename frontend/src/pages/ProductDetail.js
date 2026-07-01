import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoginPromptModal from '../components/LoginPromptModal';

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
  if (/toy|lego/.test(n))                                              return '🧸';
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
  const [pincode,        setPincode]        = useState('');
  const [deliveryNote,   setDeliveryNote]   = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeImg,      setActiveImg]      = useState(0);
  const [showArrows,    setShowArrows]    = useState(false);

  const isSeller = user?.role === 'SELLER';
  const isAdmin  = user?.role === 'ADMIN';

  useEffect(() => {
    setLoading(true);
    setError('');
    setActiveImg(0);
    api.get(`/api/products/${id}`)
      .then(res => { setProduct(res.data.data); setQuantity(1); })
      .catch(err => setError(
        err.response?.status === 404
          ? 'This product does not exist or has been removed.'
          : 'Failed to load product. Please try again.'
      ))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!product?.imageUrls || product.imageUrls.length <= 1) return;
      if (e.key === 'ArrowRight') {
        setActiveImg(prev => (prev + 1) % product.imageUrls.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImg(prev => (prev - 1 + product.imageUrls.length) % product.imageUrls.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product]);

  const addToCart = () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.productId === product.id);
    if (existing) { existing.quantity += quantity; } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, quantity });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    showToast(`${product.name} added to cart`);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const checkDelivery = () => {
    if (pincode.length === 6) {
      setDeliveryNote('✓ Usually delivered in 2-3 business days');
    }
  };

  if (loading) return (
    <div className="page-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p>Loading product...</p>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h3>Product not found</h3>
        <p>{error || 'This product could not be loaded.'}</p>
        <Link to="/products" className="btn btn-primary">← Back to Products</Link>
      </div>
    </div>
  );

  const inStock = product.stockQuantity > 0;
  const gradient = getGradient(product.name);

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - var(--navbar-h))' }}>
      {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}

      {/* Breadcrumb */}
      <nav className="pd-breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>
          {product.name.length > 40 ? product.name.slice(0, 40) + '…' : product.name}
        </span>
      </nav>

      {/* Two-column layout */}
      <div className="pd-layout">

        {/* ── Left: image gallery ─────────────────────────────────── */}
        <div className="pd-image-wrap">
          {product.imageUrls?.length > 0 ? (
            <>
              <div
                className="pd-image"
                style={{ background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}
                onMouseEnter={() => setShowArrows(true)}
                onMouseLeave={() => setShowArrows(false)}
              >
                <img
                  key={product.imageUrls[activeImg]}
                  src={product.imageUrls[activeImg]}
                  alt={product.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0, transition: 'opacity 0.15s' }}
                  onLoad={e => { e.currentTarget.style.opacity = 1; }}
                />
                {product.imageUrls.length > 1 && (
                  <>
                    <button
                      aria-label="Previous image"
                      onClick={e => { e.stopPropagation(); setActiveImg(prev => (prev - 1 + product.imageUrls.length) % product.imageUrls.length); }}
                      style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                        fontSize: 22, lineHeight: 1, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: showArrows ? 1 : 0, transition: 'opacity 0.2s',
                        zIndex: 2,
                      }}
                    >‹</button>
                    <button
                      aria-label="Next image"
                      onClick={e => { e.stopPropagation(); setActiveImg(prev => (prev + 1) % product.imageUrls.length); }}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                        fontSize: 22, lineHeight: 1, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: showArrows ? 1 : 0, transition: 'opacity 0.2s',
                        zIndex: 2,
                      }}
                    >›</button>
                  </>
                )}
              </div>
              <div className="pd-thumbnails">
                {product.imageUrls.map((url, i) => (
                  <div
                    key={url}
                    className={`pd-thumb${i === activeImg ? ' active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    style={{ cursor: 'pointer', overflow: 'hidden' }}
                  >
                    <img
                      src={url}
                      alt={`View ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="pd-image" style={{ background: gradient }}>
                <span className="pd-emoji">{getEmoji(product.name)}</span>
              </div>
              <div className="pd-thumbnails">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`pd-thumb${i === 0 ? ' active' : ''}`}>
                    <span style={{ fontSize: 20 }}>{getEmoji(product.name)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right: product info ──────────────────────────────────── */}
        <div className="pd-info">
          {product.sellerName && (
            <div className="pd-seller-badge">🏪 {product.sellerName}</div>
          )}

          <h1 className="pd-name">{product.name}</h1>

          <div className="pd-rating">
            <span style={{ color: '#f59e0b' }}>★★★★☆</span>
            <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>4.2</span>
            <span style={{ color: 'var(--text-light)' }}>(128 ratings)</span>
            <span style={{ color: 'var(--text-light)' }}>|</span>
            <span style={{
              color: product.stockQuantity === 0 ? 'var(--danger)'
                : product.stockQuantity <= 10 ? 'var(--warning)'
                : 'var(--success)',
              fontWeight: 600,
            }}>
              {product.stockQuantity === 0 ? 'Out of Stock'
                : product.stockQuantity <= 10 ? `Only ${product.stockQuantity} left!`
                : `${product.stockQuantity} in stock`}
            </span>
          </div>

          <div className="pd-price-box">
            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
              <span className="pd-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
              <span className="pd-mrp">
                ₹{Math.round(Number(product.price) * 1.2).toLocaleString('en-IN')}
              </span>
              <span className="pd-discount">17% off</span>
            </div>
            <div className="pd-limited">⚡ Limited time offer</div>
          </div>

          <div className="pd-offers">
            <h4>Available Offers</h4>
            {[
              '🏦 Bank Offer: 10% instant discount on HDFC Bank cards',
              '📋 No Cost EMI starting from ₹' + Math.round(Number(product.price) / 6).toLocaleString('en-IN') + '/month',
              '🤝 Partner Offer: Get GST invoice — save up to 18%',
            ].map((offer, i) => (
              <div key={i} className="pd-offer-item">
                <span className="pd-offer-dot">›</span>
                <span>{offer}</span>
              </div>
            ))}
          </div>

          <hr className="pd-divider" />

          {/* Action area */}
          {isSeller || isAdmin ? (
            <div className="pd-role-notice">
              {isAdmin ? '🛡️ Admin accounts cannot purchase products' : '🏪 Use a customer account to purchase'}
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
                className="pd-btn-cart"
                onClick={addToCart}
                disabled={!inStock}
              >
                {!inStock ? 'OUT OF STOCK' : addedToCart ? `✓ ADDED ${quantity > 1 ? quantity + '× ' : ''}TO CART` : 'ADD TO CART'}
              </button>
              <button
                className="pd-btn-buy"
                onClick={() => { addToCart(); if (isAuthenticated) navigate('/cart'); }}
                disabled={!inStock}
              >
                BUY NOW
              </button>
            </>
          )}

          {/* Delivery check */}
          <div className="pd-delivery">
            <h4>📦 Delivery</h4>
            <div className="pd-pincode-row">
              <input
                type="text" placeholder="Enter 6-digit pincode" maxLength={6}
                value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && checkDelivery()}
              />
              <button onClick={checkDelivery}>Check</button>
            </div>
            {deliveryNote && <div className="pd-delivery-note">{deliveryNote}</div>}
          </div>

          {/* Seller info */}
          {product.sellerName && (
            <div className="pd-seller-card">
              <div><strong>Sold by:</strong> {product.sellerName}</div>
              <div><strong>Return Policy:</strong> 7 days easy returns</div>
              {product.sellerEmail && <div><strong>Contact:</strong> {product.sellerEmail}</div>}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
              style={{ fontSize: 13 }}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Product Description + Details */}
      <div className="pd-meta-card">
        <h3>Product Description</h3>
        <div className="pd-description">
          <p>{product.description || 'No description available.'}</p>
        </div>
        <hr className="pd-divider" />
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
          Product Details
        </h3>
        {[
          ['Product ID',   `#${product.id}`],
          ['Added on',     formatDate(product.createdAt)],
          ['Seller',       product.sellerName || '—'],
          ['Availability', product.stockQuantity > 0 ? `${product.stockQuantity} units` : 'Out of Stock'],
          ['Price',        `₹${Number(product.price).toLocaleString('en-IN')}`],
        ].map(([label, value]) => (
          <div key={label} className="pd-meta-row">
            <span className="pd-meta-label">{label}</span>
            <span className="pd-meta-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
