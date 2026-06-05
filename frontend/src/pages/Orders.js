import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PAGE_SIZE = 5;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, 4, '…', total - 1];
  if (current >= total - 4) return [0, '…', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '…', current - 1, current, current + 1, '…', total - 1];
}

const TIMELINE_STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
const STEP_LABELS    = ['Order Placed', 'Confirmed', 'Shipped', 'Delivered'];

function getStepClass(stepStatus, orderStatus) {
  if (orderStatus === 'CANCELLED') return stepStatus === 'PENDING' ? 'cancelled' : '';
  const orderIdx = TIMELINE_STEPS.indexOf(orderStatus);
  const stepIdx  = TIMELINE_STEPS.indexOf(stepStatus);
  if (stepIdx <  orderIdx) return 'done';
  if (stepIdx === orderIdx) return 'active';
  return '';
}

function getEmoji(name = '') {
  const n = (name || '').toLowerCase();
  if (/phone|mobile|iphone|samsung/.test(n)) return '📱';
  if (/laptop|macbook|notebook/.test(n))     return '💻';
  if (/tv|television|monitor/.test(n))       return '📺';
  if (/headphone|earphone|speaker/.test(n))  return '🎧';
  if (/camera|dslr/.test(n))                 return '📷';
  if (/watch/.test(n))                       return '⌚';
  if (/shoe|sneaker/.test(n))                return '👟';
  if (/shirt|cloth|dress/.test(n))           return '👕';
  if (/book/.test(n))                        return '📚';
  return '🛍️';
}

const STATUS_BADGE = {
  PENDING:   'badge badge-warning',
  CONFIRMED: 'badge badge-info',
  SHIPPED:   'badge badge-purple',
  DELIVERED: 'badge badge-success',
  CANCELLED: 'badge badge-danger',
};

export default function Orders() {
  const [orders, setOrders]           = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalItems, setTotalItems]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [expandedId, setExpandedId]   = useState(null);

  const fetchPage = useCallback((page) => {
    setLoading(true);
    api.get(`/api/orders/my-orders?page=${page}&size=${PAGE_SIZE}`)
      .then(res => {
        const d = res.data.data;
        setOrders(d.content);
        setCurrentPage(d.currentPage);
        setTotalPages(d.totalPages);
        setTotalItems(d.totalItems);
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  const goToPage = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setExpandedId(null);
    fetchPage(page);
  };

  if (loading) return <div className="page-loading">Loading orders…</div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="orders-page">
      <h1>
        My Orders
        {totalItems > 0 && (
          <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-light)', marginLeft: '10px' }}>
            {totalItems} order{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <p>You haven't placed any orders. Start shopping!</p>
          <Link to="/products" className="btn btn-primary">Shop Now</Link>
        </div>
      ) : (
        <>
          {orders.map(order => (
            <div key={order.id} className="order-card">

              {/* Header */}
              <div
                className="order-card-header"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div>
                  <div className="order-id">Order #{order.id}</div>
                  <div className="order-date">{formatDate(order.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={STATUS_BADGE[order.status] || 'badge badge-gray'}>
                    {order.status}
                  </span>
                  <span className="order-total">₹{Number(order.totalAmount).toFixed(2)}</span>
                  <span className={`expand-icon${expandedId === order.id ? ' open' : ''}`}>▼</span>
                </div>
              </div>

              {/* Timeline (always visible) */}
              {order.status !== 'CANCELLED' && (
                <div className="order-timeline">
                  {TIMELINE_STEPS.map((step, i) => (
                    <div key={step} className={`timeline-step ${getStepClass(step, order.status)}`}>
                      <div className="timeline-dot">
                        {getStepClass(step, order.status) === 'done' ? '✓' : i + 1}
                      </div>
                      <div className="timeline-label">{STEP_LABELS[i]}</div>
                    </div>
                  ))}
                </div>
              )}
              {order.status === 'CANCELLED' && (
                <div style={{ padding: '12px 16px', background: 'var(--danger-light)' }}>
                  <span className="badge badge-danger">Order Cancelled</span>
                </div>
              )}

              {/* Shipped-by notice — appears when order has been dispatched */}
              {order.status === 'SHIPPED' && (
                <div style={{
                  padding: '8px 16px',
                  background: '#f5f3ff',
                  borderTop: '1px solid #ede9fe',
                  fontSize: '13px',
                  color: '#5b21b6',
                }}>
                  🚚 <strong>Shipped by: </strong>
                  {order.items?.find(i => i.sellerName)?.sellerName || order.sellerName || 'Seller'}
                </div>
              )}

              {/* Items (expanded) */}
              {expandedId === order.id && (
                <div className="order-items-section">
                  {order.items.map(item => (
                    <div key={item.id} className="order-item-row">
                      <div className="order-item-img">{getEmoji(item.productName)}</div>
                      <div style={{ flex: 1 }}>
                        <div className="order-item-name">{item.productName}</div>
                        <div className="order-item-meta">Qty: {item.quantity} × ₹{Number(item.unitPrice).toFixed(2)}</div>
                      </div>
                      <div className="order-item-price">₹{Number(item.subtotal).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="order-card-footer">
                <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                </span>
                <button className="order-track-btn">TRACK ORDER</button>
              </div>

            </div>
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn page-btn-arrow" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>← Prev</button>
              {pageRange(currentPage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="page-ellipsis">…</span>
                ) : (
                  <button key={p} className={`page-btn${p === currentPage ? ' active' : ''}`} onClick={() => goToPage(p)}>{p + 1}</button>
                )
              )}
              <button className="page-btn page-btn-arrow" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
