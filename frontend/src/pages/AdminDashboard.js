import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_BADGE = {
  PENDING:  { label: 'Pending',  color: '#f59e0b' },
  APPROVED: { label: 'Approved', color: '#10b981' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
};

function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || { label: status, color: '#888' };
  return (
    <span style={{
      background: badge.color,
      color: '#fff',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: 600,
    }}>
      {badge.label}
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('pending');
  const [pendingSellers, setPendingSellers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(null); // { sellerId, sellerName }
  const [rejectReason, setRejectReason] = useState('');

  // Redirect non-admins away
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/products');
    }
  }, [user, navigate]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/sellers/pending');
      setPendingSellers(res.data.data || []);
    } catch {
      setPendingSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/sellers');
      setAllSellers(res.data.data || []);
    } catch {
      setAllSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'pending') fetchPending();
    else fetchAll();
  }, [tab, fetchPending, fetchAll]);

  const handleApprove = async (sellerId) => {
    setActionMsg('');
    try {
      await api.put('/api/sellers/approve', { sellerId, status: 'APPROVED' });
      setActionMsg('Seller approved successfully! They will receive a confirmation email.');
      fetchPending();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Action failed.');
    }
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

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '—';

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Manage seller applications</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['pending', 'all'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setActionMsg(''); }}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`}
          >
            {t === 'pending' ? 'Pending Applications' : 'All Sellers'}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : tab === 'pending' ? (
        <>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            Pending Applications ({pendingSellers.length})
          </h2>
          {pendingSellers.length === 0 ? (
            <p style={{ color: '#888' }}>No pending applications right now.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                    {['Name', 'Business Name', 'Email', 'Applied Date', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', borderBottom: '2px solid #e9ecef', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingSellers.map((seller) => (
                    <tr key={seller.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '10px 14px' }}>{seller.name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{seller.businessName}</strong>
                        {seller.businessDescription && (
                          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                            {seller.businessDescription}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{seller.email}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{formatDate(seller.sellerRequestedAt)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 14px', fontSize: '0.85rem' }}
                            onClick={() => handleApprove(seller.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 14px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => openRejectModal(seller.id, seller.name)}
                          >
                            Reject
                          </button>
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            All Sellers ({allSellers.length})
          </h2>
          {allSellers.length === 0 ? (
            <p style={{ color: '#888' }}>No sellers registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                    {['Name', 'Business Name', 'Email', 'Status', 'Applied', 'Approved'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', borderBottom: '2px solid #e9ecef', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSellers.map((seller) => (
                    <tr key={seller.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '10px 14px' }}>{seller.name}</td>
                      <td style={{ padding: '10px 14px' }}>{seller.businessName}</td>
                      <td style={{ padding: '10px 14px' }}>{seller.email}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={seller.sellerStatus} /></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{formatDate(seller.sellerRequestedAt)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{formatDate(seller.sellerApprovedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '2rem',
            width: '420px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Reject Seller</h3>
            <p style={{ color: '#555', marginBottom: '1rem' }}>
              Provide a reason for rejecting <strong>{rejectModal.sellerName}</strong>. They will receive this in an email.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleReject}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
