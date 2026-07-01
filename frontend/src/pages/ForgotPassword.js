import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">

      {/* ── Left ─────────────────────────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-left-logo">🔑</div>
        <div className="auth-left-title">Password<br />Recovery</div>
        <div className="auth-left-sub">We've got you covered</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">📧 Check your email</div>
          <div className="auth-left-pill">🔗 Click the reset link</div>
          <div className="auth-left-pill">🔒 Set new password</div>
        </div>
      </div>

      {/* ── Right ────────────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-wrap">

          <div className="auth-logo-text">🛍️ EcomShop</div>

          {/* Progress indicator */}
          <div className="progress-steps">
            <div className="progress-step">
              <div className={`progress-dot${submitted ? ' done' : ' active'}`}>
                {submitted ? '✓' : '1'}
              </div>
              <div className={`progress-label${submitted ? ' done' : ' active'}`}>Email</div>
            </div>
            <div className={`progress-connector${submitted ? ' done' : ''}`} />
            <div className="progress-step">
              <div className={`progress-dot${submitted ? ' active' : ''}`}>2</div>
              <div className={`progress-label${submitted ? ' active' : ''}`}>Check Mail</div>
            </div>
            <div className="progress-connector" />
            <div className="progress-step">
              <div className="progress-dot">3</div>
              <div className="progress-label">Reset Done</div>
            </div>
          </div>

          {submitted ? (
            <>
              <div style={{
                textAlign: 'center', padding: '24px 0',
              }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
                <div className="auth-title" style={{ marginBottom: 8 }}>Check your inbox!</div>
                <p style={{ color: 'var(--text-medium)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  If an account with <strong>{email}</strong> exists, we've sent a password reset link. Check your inbox and spam folder.
                </p>
                <div className="alert alert-success">
                  ✓ Reset link sent! The link expires in 15 minutes.
                </div>
              </div>
              <div className="auth-links">
                <span><Link to="/login">← Back to Login</Link></span>
              </div>
            </>
          ) : (
            <>
              <div className="auth-title">Forgot Password?</div>
              <div className="auth-subtitle">
                Enter your registered email and we'll send you a reset link
              </div>

              {error && <div className="alert alert-error">⚠️ {error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-icon-wrap">
                    <span className="field-icon">✉️</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'SEND RESET LINK'}
                </button>
              </form>

              <div className="auth-links" style={{ marginTop: 24 }}>
                <span><Link to="/login">← Back to Login</Link></span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
