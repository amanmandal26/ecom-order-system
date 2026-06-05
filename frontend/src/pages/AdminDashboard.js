import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_BADGE = {
  PENDING:  'badge badge-warning',
  APPROVED: 'badge badge-success',
  REJECTED: 'badge badge-danger',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
      setActionMsg('✅ Seller approved! They will receive a confirmation email.');
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
        sellerId: rejectModal.sellerId, status: 'REJECTED',
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
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.3px' }}>Admin Panel — Platform Management</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Logged in as <strong>{user?.name}</strong> · Administrator
        </p>
      </div>

      {/* Admin-only info banner */}
      <div style={{
        background: 'var(--warning-light)',
        border: '1px solid #FDE68A',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#92400e',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
      }}>
        <span style={{ flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong>You are logged in as Administrator.</strong> Admin accounts are for platform management only.
          To shop on EcomShop, please{' '}
          <a href="/register" style={{ color: '#92400e', fontWeight: 600 }}>register a separate customer account</a>.
        </span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-label">Total Sellers</div>
          <div className="stat-value">{allSellers.length || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-label">Pending Applications</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{pendingSellers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Approved Sellers</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{approvedCount || '—'}</div>
        </div>
      </div>

      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'pending' ? ' active' : ''}`}
          onClick={() => { setTab('pending'); setActionMsg(''); }}>
          ⏳ Pending ({pendingSellers.length})
        </button>
        <button className={`tab-btn${tab === 'all' ? ' active' : ''}`}
          onClick={() => { setTab('all'); setActionMsg(''); }}>
          🏪 All Sellers
        </button>
      </div>

      {loading ? (
        <div className="page-loading" style={{ minHeight: '30vh' }}>⏳ Loading...</div>
      ) : tab === 'pending' ? (
        <>
          {pendingSellers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3>All clear!</h3>
              <p>No pending seller applications right now.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Business</th>
                    <th>Email</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSellers.map(seller => (
                    <tr key={seller.id}>
                      <td style={{ fontWeight: 600 }}>{seller.name}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{seller.businessName}</div>
                        {seller.businessDescription && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {seller.businessDescription.length > 60
                              ? seller.businessDescription.slice(0, 60) + '…'
                              : seller.businessDescription}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{seller.email}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {formatDate(seller.sellerRequestedAt)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-success"
                            onClick={() => handleApprove(seller.id)}>✅ Approve</button>
                          <button className="btn btn-sm btn-danger"
                            onClick={() => openRejectModal(seller.id, seller.name)}>✗ Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {allSellers.length === 0 ? (
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
                    <th>Name</th>
                    <th>Business</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {allSellers.map(seller => (
                    <tr key={seller.id}>
                      <td style={{ fontWeight: 600 }}>{seller.name}</td>
                      <td>{seller.businessName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{seller.email}</td>
                      <td>
                        <span className={STATUS_BADGE[seller.sellerStatus] || 'badge badge-gray'}>
                          {seller.sellerStatus}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatDate(seller.sellerRequestedAt)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatDate(seller.sellerApprovedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>✗ Reject Seller</h3>
              <button className="modal-close" onClick={() => setRejectModal(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Provide a reason for rejecting <strong>{rejectModal.sellerName}</strong>.
              They will receive this in an email.
            </p>
            <div className="form-group">
              <label>Reason <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
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
