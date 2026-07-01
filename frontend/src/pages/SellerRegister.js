import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function SellerRegister() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    businessName: '', businessDescription: '',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/api/sellers/register', form);
      setSuccess(res.data.message || 'Application submitted! You will receive an email once approved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="auth-split">
      <div className="auth-split-left">
        <div className="auth-left-logo">🎉</div>
        <div className="auth-left-title">Application<br />Submitted!</div>
        <div className="auth-left-sub">We'll review it shortly</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">✓ Application received</div>
          <div className="auth-left-pill">⏳ Under review (1-2 days)</div>
          <div className="auth-left-pill">📧 Email notification</div>
        </div>
      </div>
      <div className="auth-split-right">
        <div className="auth-form-wrap" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div className="auth-title" style={{ marginBottom: 12 }}>You're all set!</div>
          <div className="alert alert-success">{success}</div>
          <p style={{ color: 'var(--text-medium)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Our team will review your application within 1-2 business days. You'll receive an email notification.
          </p>
          <Link to="/login" className="btn btn-primary btn-full">Go to Login →</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-split">

      {/* ── Left ─────────────────────────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-left-logo">🏪</div>
        <div className="auth-left-title">Sell on<br />EcomShop</div>
        <div className="auth-left-sub">Reach millions of buyers</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">📦 Easy product listing</div>
          <div className="auth-left-pill">💰 Competitive pricing</div>
          <div className="auth-left-pill">🚀 Fast onboarding</div>
          <div className="auth-left-pill">🤝 Seller support 24/7</div>
        </div>
      </div>

      {/* ── Right ────────────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-wrap">

          <div className="auth-logo-text">🛍️ EcomShop</div>
          <div className="auth-title">Seller Registration</div>
          <div className="auth-subtitle">
            Create your seller account — we'll review your application
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrap">
                <span className="field-icon">👤</span>
                <input
                  type="text" name="name" value={form.name}
                  onChange={handleChange} placeholder="Your full name" required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrap">
                <span className="field-icon">✉️</span>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com" required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <span className="field-icon">🔒</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange} placeholder="Min. 6 characters"
                  required style={{ paddingRight: 44 }}
                />
                <button type="button" className="field-icon-right" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Business / Shop Name</label>
              <div className="input-icon-wrap">
                <span className="field-icon">🏪</span>
                <input
                  type="text" name="businessName" value={form.businessName}
                  onChange={handleChange} placeholder="e.g. Aman's Electronics" required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Business Description
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
              </label>
              <textarea
                name="businessDescription"
                value={form.businessDescription}
                onChange={handleChange}
                placeholder="What products will you sell? Brief description of your business..."
                rows={3}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid var(--border)', borderRadius: 4,
                  fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                  outline: 'none', color: 'var(--text-dark)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'SUBMIT APPLICATION'}
            </button>
          </form>

          <div className="auth-links" style={{ marginTop: 20 }}>
            <span>Already have an account? <Link to="/login">Sign In</Link></span>
            <span>Shop instead? <Link to="/register">Customer Registration</Link></span>
          </div>

        </div>
      </div>
    </div>
  );
}
