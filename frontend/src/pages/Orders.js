import React, { useEffect, useState } from 'react';
import api from '../services/api';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/api/orders/my-orders')
      .then((res) => setOrders(res.data.data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <div className="page-loading">Loading orders...</div>;
  if (error) return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">My Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>You haven't placed any orders yet.</p>
          <a href="/products" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Start Shopping
          </a>
        </div>
      ) : (
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
      )}
    </div>
  );
}
