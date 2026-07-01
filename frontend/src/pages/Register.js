import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getPasswordStrength(pw) {
  if (!pw) return null;
  if (pw.length < 6) return 'weak';
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'medium';
  return 'strong';
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [agreed,   setAgreed]   = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError('Please agree to the Terms & Conditions.'); return; }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">

      {/* ── Left: illustration panel ────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-left-logo">🛍️</div>
        <div className="auth-left-title">Join India's<br />Largest</div>
        <div className="auth-left-sub">Shopping Community</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">🚀 Free to join</div>
          <div className="auth-left-pill">🔒 Privacy protected</div>
          <div className="auth-left-pill">🎁 Exclusive member deals</div>
        </div>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-wrap">

          <div className="auth-logo-text">🛍️ EcomShop</div>
          <div className="auth-title">Create Account</div>
          <div className="auth-subtitle">Join EcomShop and start shopping</div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrap">
                <span className="field-icon">👤</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

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
                  placeholder="Min. 6 characters"
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
              {strength && (
                <div className={`pw-strength pw-${strength}`}>
                  <div className="pw-strength-bar" />
                  <div className="pw-strength-label">
                    {strength === 'weak' ? 'Weak password' : strength === 'medium' ? 'Medium strength' : 'Strong password ✓'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                cursor: 'pointer', fontSize: 13, color: 'var(--text-medium)',
              }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setError(''); }}
                  style={{ marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }}
                />
                <span>
                  I agree to the{' '}
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms &amp; Conditions</span>
                  {' '}and{' '}
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="auth-divider">OR</div>

          <div className="auth-links">
            <span>Already have an account? <Link to="/login">Sign In</Link></span>
            <span>Want to sell? <Link to="/seller-register">Seller Registration</Link></span>
          </div>

        </div>
      </div>
    </div>
  );
}
