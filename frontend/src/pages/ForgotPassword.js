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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h2>Forgot Password?</h2>
        <p className="auth-subtitle">Enter your email and we'll send a reset link</p>

        {submitted ? (
          <>
            <div className="alert alert-success">
              ✅ If this email exists, we've sent a reset link. Check your inbox.
            </div>
            <div className="auth-links">
              <span><Link to="/login">← Back to Login</Link></span>
            </div>
          </>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
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
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}
                style={{ marginTop: '0.5rem' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="auth-links">
              <span><Link to="/login">← Back to Login</Link></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
