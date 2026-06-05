import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function LoginPromptModal({ onClose }) {
  const location = useLocation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <h3>🔒 Sign in to continue</h3>
          <button className="modal-close" onClick={onClose} style={{ position: 'absolute', right: 0 }}>×</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Create a free account or sign in to add items to your cart and place orders.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link
            to="/login"
            state={{ from: location }}
            className="btn btn-primary"
            onClick={onClose}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            state={{ from: location }}
            className="btn btn-ghost"
            onClick={onClose}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
