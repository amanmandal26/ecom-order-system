import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

function getPasswordStrength(pw) {
  if (!pw) return null;
  if (pw.length < 6) return 'weak';
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'medium';
  return 'strong';
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token');
  const navigate       = useNavigate();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw1,         setShowPw1]         = useState(false);
  const [showPw2,         setShowPw2]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  const strength = getPasswordStrength(newPassword);

  if (!token) return (
    <div className="auth-split">
      <div className="auth-split-left">
        <div className="auth-left-logo">⚠️</div>
        <div className="auth-left-title">Invalid<br />Link</div>
        <div className="auth-left-sub">Please request a new one</div>
      </div>
      <div className="auth-split-right">
        <div className="auth-form-wrap" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
          <div className="auth-title" style={{ marginBottom: 12 }}>Invalid Reset Link</div>
          <div className="alert alert-error">
            This reset link is invalid or has expired. Please request a new one.
          </div>
          <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
            Request New Link
          </Link>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
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
    <div className="auth-split">

      {/* ── Left ─────────────────────────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-left-logo">🔒</div>
        <div className="auth-left-title">Set Your<br />New Password</div>
        <div className="auth-left-sub">Almost there!</div>
        <div className="auth-left-pills">
          <div className="auth-left-pill">✓ Email verified</div>
          <div className="auth-left-pill">✓ Identity confirmed</div>
          <div className="auth-left-pill">→ Create new password</div>
        </div>
      </div>

      {/* ── Right ────────────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-wrap">

          <div className="auth-logo-text">🛍️ EcomShop</div>

          {/* Progress */}
          <div className="progress-steps">
            <div className="progress-step">
              <div className="progress-dot done">✓</div>
              <div className="progress-label done">Email</div>
            </div>
            <div className="progress-connector done" />
            <div className="progress-step">
              <div className="progress-dot done">✓</div>
              <div className="progress-label done">Check Mail</div>
            </div>
            <div className="progress-connector done" />
            <div className="progress-step">
              <div className={`progress-dot${success ? ' done' : ' active'}`}>
                {success ? '✓' : '3'}
              </div>
              <div className={`progress-label${success ? ' done' : ' active'}`}>Reset Done</div>
            </div>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div className="auth-title" style={{ marginBottom: 8 }}>Password Reset!</div>
              <div className="alert alert-success">
                ✓ Password reset successfully! Redirecting to login…
              </div>
            </div>
          ) : (
            <>
              <div className="auth-title">Reset Password</div>
              <div className="auth-subtitle">Enter your new password below</div>

              {error && <div className="alert alert-error">⚠️ {error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-icon-wrap">
                    <span className="field-icon">🔒</span>
                    <input
                      type={showPw1 ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required minLength={6}
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" className="field-icon-right" onClick={() => setShowPw1(v => !v)} tabIndex={-1}>
                      {showPw1 ? '🙈' : '👁️'}
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

                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-icon-wrap">
                    <span className="field-icon">🔒</span>
                    <input
                      type={showPw2 ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" className="field-icon-right" onClick={() => setShowPw2(v => !v)} tabIndex={-1}>
                      {showPw2 ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                      ✕ Passwords do not match
                    </div>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                      ✓ Passwords match
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? 'Resetting…' : 'RESET PASSWORD'}
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
