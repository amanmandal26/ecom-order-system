import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function LoginPromptModal({ onClose }) {
  const location = useLocation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 400, textAlign: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>
          Sign in to continue
        </h3>
        <p style={{ color: 'var(--text-medium)', marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
          Create a free account or sign in to add items to your cart and place orders.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
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
        <button
          onClick={onClose}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            color: 'var(--text-light)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
