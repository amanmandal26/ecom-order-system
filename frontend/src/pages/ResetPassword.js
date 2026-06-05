import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token');
  const navigate       = useNavigate();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">⚠️</div>
          <h2>Invalid Link</h2>
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            This reset link is invalid or has expired. Please request a new one.
          </div>
          <div className="auth-links">
            <span><Link to="/forgot-password">Request new reset link</Link></span>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword, confirmPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔒</div>
        <h2>Reset Password</h2>
        <p className="auth-subtitle">Enter your new password below</p>

        {success ? (
          <div className="alert alert-success">
            ✅ Password reset successfully! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-icon-wrap">
                  <span className="field-icon">🔒</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required minLength={6}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-icon-wrap">
                  <span className="field-icon">🔒</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}
                style={{ marginTop: '0.5rem' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
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
