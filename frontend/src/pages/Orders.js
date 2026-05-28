import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const PAGE_SIZE = 5;

const STATUS_COLORS = {
  PENDING:   '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED:   '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

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
      .then((res) => {
        const paged = res.data.data;
        setOrders(paged.content);
        setCurrentPage(paged.currentPage);
        setTotalPages(paged.totalPages);
        setTotalItems(paged.totalItems);
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const goToPage = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setExpandedId(null);
    fetchPage(page);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <div className="page-loading">Loading orders...</div>;
  if (error)   return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">
        My Orders
        {totalItems > 0 && (
          <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#888', marginLeft: '0.75rem' }}>
            ({totalItems} total)
          </span>
        )}
      </h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>You haven't placed any orders yet.</p>
          <a href="/products" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Start Shopping
          </a>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header" onClick={() => toggleExpand(order.id)}>
                  <div className="order-header-left">
                    <span className="order-id">Order #{order.id}</span>
                    <span
                      className="order-status"
                      style={{ backgroundColor: STATUS_COLORS[order.status] || '#6b7280' }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="order-header-right">
                    <span className="order-total">${Number(order.totalAmount).toFixed(2)}</span>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                    <span className="expand-icon">{expandedId === order.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === order.id && (
                  <div className="order-items">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>${Number(item.unitPrice).toFixed(2)}</td>
                            <td>${Number(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                className="btn btn-outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                ← Previous
              </button>

              <span style={{ color: '#555', fontSize: '0.95rem' }}>
                Page {currentPage + 1} of {totalPages}
              </span>

              <button
                className="btn btn-outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const paginationStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1.25rem',
  marginTop: '2rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e9ecef',
};
