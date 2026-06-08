import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function getCart()      { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); window.dispatchEvent(new Event('cartUpdated')); }

function getEmoji(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile|iphone|samsung/.test(n)) return '📱';
  if (/laptop|macbook|notebook/.test(n))     return '💻';
  if (/tv|television|monitor/.test(n))       return '📺';
  if (/headphone|earphone|speaker/.test(n))  return '🎧';
  if (/camera|dslr/.test(n))                 return '📷';
  if (/watch/.test(n))                       return '⌚';
  if (/shoe|sneaker/.test(n))                return '👟';
  if (/shirt|cloth|dress/.test(n))           return '👕';
  if (/book/.test(n))                        return '📚';
  return '🛍️';
}

export default function Cart() {
  const [cart,    setCart]    = useState(getCart());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load Razorpay checkout script once when the cart mounts
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  useEffect(() => { setCart(getCart()); }, []);

  if (user?.role === 'ADMIN') {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <h3>Admin accounts cannot place orders</h3>
          <p>Admin accounts are for platform management only.</p>
          <Link to="/admin" className="btn btn-primary">Go to Admin Panel</Link>
        </div>
      </div>
    );
  }
  if (user?.role === 'SELLER') {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <h3>Seller accounts cannot place orders</h3>
          <p>To shop, register a separate customer account.</p>
          <Link to="/seller-dashboard" className="btn btn-primary">Go to Seller Dashboard</Link>
        </div>
      </div>
    );
  }

  const updateQty = (productId, delta) => {
    const updated = cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    saveCart(updated); setCart(updated);
  };

  const removeItem = (productId) => {
    const updated = cart.filter(item => item.productId !== productId);
    saveCart(updated); setCart(updated);
  };

  const subtotal  = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!cart.length) return;
    setError(''); setLoading(true);

    try {
      // Step 1: Create the order in our backend → get an order ID and the real total
      const orderRes = await api.post('/api/orders', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
      });
      const appOrderId = orderRes.data.data.id;

      // Step 2: Ask our backend to create a Razorpay order for that order ID
      const paymentRes = await api.post('/api/payments/create-order', {
        orderId: appOrderId
      });
      const { razorpayOrderId, amount, currency, keyId } = paymentRes.data.data;

      // Step 3: Open the Razorpay checkout popup
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'EcomShop',
        description: 'Order Payment',
        order_id: razorpayOrderId,
        handler: async function (paymentResponse) {
          try {
            const verifyRes = await api.post('/api/payments/verify', {
              razorpayOrderId:   paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              appOrderId: appOrderId
            });

            if (verifyRes.data.success) {
              saveCart([]);
              setCart([]);
              navigate('/orders');
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed: ' +
              (error.response?.data?.message || error.message));
          }
        },
        prefill: {
          name:  user?.name  || '',
          email: user?.email || ''
        },
        theme: { color: '#6C63FF' },
        modal: {
          ondismiss: function () {
            setError('Payment cancelled. Your order has been created — retry payment from Orders page.');
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty!</h3>
          <p>Add items to it now.</p>
          <Link to="/products" className="btn btn-primary">Shop Now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">

      {/* ── Left: cart items ──────────────────────────────────────── */}
      <div className="cart-left">
        <div className="cart-header">
          <h1>My Cart</h1>
          <span className="badge badge-info">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="cart-deliver" style={{ marginBottom: '1px' }}>
          📍 Deliver to: <strong>Your Location</strong>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '8px 0' }}>{error}</div>}

        <div className="cart-items-box">
          {cart.map(item => (
            <div key={item.productId} className="cart-item">
              <div className="cart-item-img">{getEmoji(item.name)}</div>

              <div className="cart-item-details">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-seller">Seller: EcomShop Official</div>
                <div className="cart-item-price">
                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: '8px', fontWeight: 400 }}>
                    ₹{Number(item.price).toFixed(2)} each
                  </span>
                </div>

                <div className="cart-qty">
                  <button className="cart-qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                  <div className="cart-qty-num">{item.quantity}</div>
                  <button className="cart-qty-btn" onClick={() => updateQty(item.productId, +1)}>+</button>
                </div>

                <div className="cart-item-actions">
                  <button className="cart-action-btn" onClick={() => removeItem(item.productId)}>REMOVE</button>
                  <button className="cart-action-btn">SAVE FOR LATER</button>
                </div>
              </div>
            </div>
          ))}

          <div className="cart-place-row">
            <button className="btn btn-secondary btn-lg" onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'Processing…' : `Pay ₹${subtotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: price details ──────────────────────────────────── */}
      <div className="cart-right">
        <div className="price-card">
          <div className="price-card-header">Price Details</div>
          <div className="price-card-body">
            <div className="price-row">
              <span>Price ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Discount</span>
              <span className="price-green">−&nbsp;₹0</span>
            </div>
            <div className="price-row">
              <span>Delivery Charges</span>
              <span className="price-green">FREE</span>
            </div>
            <div className="price-row total">
              <span>Total Amount</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <button className="price-card-btn" onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'PROCESSING…' : `PROCEED TO PAY ₹${subtotal.toFixed(2)}`}
            </button>
          </div>
          <div className="price-safe">🔒 Safe and Secure Payments. Easy returns.</div>
        </div>
      </div>

    </div>
  );
}
