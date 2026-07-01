import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const authData = await login(email, password);
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (authData.role === 'ADMIN') {
        navigate('/admin');
      } else if (authData.role === 'SELLER') {
        navigate('/seller-dashboard');
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">

      {/* ── Left: illustration panel ────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-left-logo">🛍️</div>
        <div className="auth-left-title">India's Most<br />Trusted</div>
        <div className="auth-left-sub">Online Marketplace</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">✓ 10,000+ Products</div>
          <div className="auth-left-pill">✓ Secure Payments</div>
          <div className="auth-left-pill">✓ Fast Delivery</div>
        </div>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-wrap">

          <div className="auth-logo-text">🛍️ EcomShop</div>
          <div className="auth-title">Welcome back!</div>
          <div className="auth-subtitle">Sign in to your account to continue</div>

          {error && (
            <div className="alert alert-error">
              ⚠️ {error}
            </div>
          )}

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

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <span className="field-icon">🔒</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="field-icon-right"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 20, fontSize: 13,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-medium)' }}>Remember me</span>
              </label>
              <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'SIGN IN'}
            </button>
          </form>

          <div className="auth-divider">OR</div>

          <div className="auth-links">
            <span>New to EcomShop? <Link to="/register">Create account</Link></span>
            <span>Want to sell? <Link to="/seller-register">Seller Registration</Link></span>
          </div>

        </div>
      </div>
    </div>
  );
}
