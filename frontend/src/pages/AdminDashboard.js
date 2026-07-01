import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_META = {
  PENDING:  { cls: 'badge-warning', bg: '#fef3c7', color: '#92400e' },
  APPROVED: { cls: 'badge-success', bg: '#d1fae5', color: '#065f46' },
  REJECTED: { cls: 'badge-danger',  bg: '#fee2e2', color: '#991b1b' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,            setTab]            = useState('pending');
  const [pendingSellers, setPendingSellers] = useState([]);
  const [allSellers,     setAllSellers]     = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [actionMsg,      setActionMsg]      = useState('');
  const [rejectModal,    setRejectModal]    = useState(null);
  const [rejectReason,   setRejectReason]   = useState('');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/products');
  }, [user, navigate]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/api/sellers/pending'); setPendingSellers(r.data.data || []); }
    catch { setPendingSellers([]); } finally { setLoading(false); }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/api/sellers'); setAllSellers(r.data.data || []); }
    catch { setAllSellers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'pending') fetchPending(); else fetchAll();
  }, [tab, fetchPending, fetchAll]);

  const handleApprove = async (sellerId) => {
    setActionMsg('');
    try {
      await api.put('/api/sellers/approve', { sellerId, status: 'APPROVED' });
      setActionMsg('Seller approved! They will receive a confirmation email.');
      fetchPending();
    } catch (err) { setActionMsg(err.response?.data?.message || 'Action failed.'); }
  };

  const openRejectModal = (sellerId, sellerName) => {
    setRejectModal({ sellerId, sellerName });
    setRejectReason('');
    setActionMsg('');
  };

  const handleReject = async () => {
    try {
      await api.put('/api/sellers/approve', {
        sellerId: rejectModal.sellerId,
        status: 'REJECTED',
        reason: rejectReason || 'No reason provided',
      });
      setActionMsg('Seller rejected. They will be notified by email.');
      setRejectModal(null);
      fetchPending();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Action failed.');
      setRejectModal(null);
    }
  };

  const approvedCount = allSellers.filter(s => s.sellerStatus === 'APPROVED').length;

  return (
    <div className="dashboard-wrap">

      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.3px' }}>
            Admin Panel
          </h1>
          <span style={{
            background: 'var(--danger)', color: '#fff',
            padding: '3px 10px', borderRadius: 4,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.5px',
          }}>
            ADMIN
          </span>
        </div>
        <p style={{ color: 'var(--text-medium)', fontSize: 14 }}>
          Platform Management — logged in as <strong>{user?.name}</strong>
        </p>
      </div>

      {/* Admin info banner */}
      <div className="info-banner info-banner-yellow">
        <span style={{ flexShrink: 0 }}>⚠️</span>
        <span>
          <strong>You are logged in as Administrator.</strong> Admin accounts are for platform management only.
          To shop, please{' '}
          <a href="/register">register a separate customer account</a>.
        </span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue-border">
          <div className="stat-icon">🏪</div>
          <div className="stat-label">Total Sellers</div>
          <div className="stat-value">{allSellers.length || '—'}</div>
        </div>
        <div className="stat-card orange-border">
          <div className="stat-icon">⏳</div>
          <div className="stat-label">Pending Applications</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{pendingSellers.length}</div>
        </div>
        <div className="stat-card green-border">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Approved Sellers</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{approvedCount || '—'}</div>
        </div>
        <div className="stat-card red-border">
          <div className="stat-icon">✕</div>
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {allSellers.filter(s => s.sellerStatus === 'REJECTED').length || '—'}
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className={`alert ${actionMsg.toLowerCase().includes('reject') ? 'alert-warning' : 'alert-success'}`}>
          {actionMsg.toLowerCase().includes('reject') ? '⚠️' : '✓'} {actionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'pending' ? ' active' : ''}`}
          onClick={() => { setTab('pending'); setActionMsg(''); }}
        >
          ⏳ Pending ({pendingSellers.length})
        </button>
        <button
          className={`tab-btn${tab === 'all' ? ' active' : ''}`}
          onClick={() => { setTab('all'); setActionMsg(''); }}
        >
          🏪 All Sellers
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 40 }}>⏳</div>
          <p>Loading…</p>
        </div>
      ) : tab === 'pending' ? (
        pendingSellers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>All clear!</h3>
            <p>No pending seller applications right now.</p>
          </div>
        ) : (
          <div>
            {pendingSellers.map(seller => (
              <div key={seller.id} className="application-card">
                <div className="applicant-avatar">
                  {getInitials(seller.name)}
                </div>
                <div className="applicant-info">
                  <div className="applicant-biz">{seller.businessName}</div>
                  <div className="applicant-meta">
                    👤 {seller.name} &nbsp;·&nbsp; ✉️ {seller.email} &nbsp;·&nbsp; 📅 Applied: {formatDate(seller.sellerRequestedAt)}
                  </div>
                  {seller.businessDescription && (
                    <div className="applicant-desc">
                      "{seller.businessDescription.length > 100
                        ? seller.businessDescription.slice(0, 100) + '…'
                        : seller.businessDescription}"
                    </div>
                  )}
                </div>
                <div className="application-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(seller.id)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    onClick={() => openRejectModal(seller.id, seller.name)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        allSellers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏪</div>
            <h3>No sellers yet</h3>
            <p>No sellers have registered on the platform yet.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Business</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {allSellers.map(seller => {
                  const meta = STATUS_META[seller.sellerStatus] || STATUS_META.PENDING;
                  return (
                    <tr key={seller.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--primary)', color: '#fff',
                            fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {getInitials(seller.name)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{seller.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-dark)' }}>{seller.businessName}</td>
                      <td style={{ color: 'var(--text-medium)' }}>{seller.email}</td>
                      <td>
                        <span style={{
                          background: meta.bg, color: meta.color,
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 800, letterSpacing: '0.3px',
                        }}>
                          {seller.sellerStatus}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>
                        {formatDate(seller.sellerRequestedAt)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>
                        {formatDate(seller.sellerApprovedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>✕ Reject Seller</h3>
              <button className="modal-close" onClick={() => setRejectModal(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-medium)', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
              Provide a reason for rejecting <strong>{rejectModal.sellerName}</strong>.
              They will receive this in a notification email.
            </p>
            <div className="form-group">
              <label>
                Reason
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
