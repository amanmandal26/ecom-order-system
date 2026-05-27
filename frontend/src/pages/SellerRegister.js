import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function SellerRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    businessDescription: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/api/sellers/register', form);
      setSuccess(response.data.message || 'Registration submitted! You will receive an email once approved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Application Submitted!</h2>
          <div className="alert alert-success" style={{ marginTop: '1rem' }}>
            {success}
          </div>
          <p className="auth-link" style={{ marginTop: '1.5rem' }}>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sell on EcomShop</h2>
        <p className="auth-subtitle">Create your seller account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              required
            />
          </div>
          <div className="form-group">
            <label>Business / Shop Name</label>
            <input
              type="text"
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="e.g. Aman's Electronics"
              required
            />
          </div>
          <div className="form-group">
            <label>Business Description <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
            <textarea
              name="businessDescription"
              value={form.businessDescription}
              onChange={handleChange}
              placeholder="What products will you sell?"
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
