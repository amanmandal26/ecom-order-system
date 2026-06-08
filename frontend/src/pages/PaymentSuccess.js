import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;

  return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-state-icon">✅</div>
        <h2>Payment Successful!</h2>
        {orderId && (
          <p style={{ fontSize: '16px', color: 'var(--text-light)' }}>
            Order <strong>#{orderId}</strong> has been confirmed.
          </p>
        )}
        <p>You will receive a confirmation email shortly.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/orders')}>
            View My Orders
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/products')}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
