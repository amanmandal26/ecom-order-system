import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));
}

export default function Cart() {
  const [cart, setCart] = useState(getCart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setCart(getCart());
  }, []);

  const updateQuantity = (productId, delta) => {
    const updated = cart.map((item) => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    saveCart(updated);
    setCart(updated);
  };

  const removeItem = (productId) => {
    const updated = cart.filter((item) => item.productId !== productId);
    saveCart(updated);
    setCart(updated);
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setError('');
    setLoading(true);
    try {
      const orderPayload = {
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };
      await api.post('/api/orders', orderPayload);
      saveCart([]);
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Cart</h1>
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <a href="/products" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Browse Products
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Cart</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.productId} className="cart-item">
              <div className="cart-item-info">
                <h3>{item.name}</h3>
                <p className="cart-item-price">${Number(item.price).toFixed(2)} each</p>
              </div>
              <div className="cart-item-controls">
                <button className="qty-btn" onClick={() => updateQuantity(item.productId, -1)}>−</button>
                <span className="qty-display">{item.quantity}</span>
                <button className="qty-btn" onClick={() => updateQuantity(item.productId, 1)}>+</button>
                <span className="cart-item-subtotal">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                <button className="btn-remove" onClick={() => removeItem(item.productId)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="summary-row summary-total">
            <strong>Total</strong>
            <strong>${total.toFixed(2)}</strong>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={placeOrder}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
