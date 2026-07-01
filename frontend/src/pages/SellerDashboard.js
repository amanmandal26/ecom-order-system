import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ── Helpers (same logic as Products/Landing for consistency) ──────────────────

function getEmoji(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile|iphone|samsung|oneplus|oppo|vivo|pixel/.test(n)) return '📱';
  if (/laptop|macbook|dell|hp|lenovo|asus|notebook/.test(n))          return '💻';
  if (/tv|television|monitor|screen|display/.test(n))                  return '📺';
  if (/headphone|earphone|airpod|earbud|speaker|audio/.test(n))       return '🎧';
  if (/camera|dslr|gopro/.test(n))                                     return '📷';
  if (/watch|smartwatch/.test(n))                                      return '⌚';
  if (/keyboard|mouse|gaming/.test(n))                                 return '🎮';
  if (/shoe|boot|sneaker/.test(n))                                     return '👟';
  if (/shirt|tshirt|cloth|dress|jeans/.test(n))                       return '👕';
  if (/book|novel/.test(n))                                            return '📚';
  return '🛍️';
}

function getGradient(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile/.test(n))    return 'linear-gradient(135deg,#667eea,#764ba2)';
  if (/laptop|computer/.test(n)) return 'linear-gradient(135deg,#11998e,#38ef7d)';
  if (/headphone|audio/.test(n)) return 'linear-gradient(135deg,#f093fb,#f5576c)';
  if (/watch/.test(n))           return 'linear-gradient(135deg,#4facfe,#00f2fe)';
  if (/tv|television/.test(n))   return 'linear-gradient(135deg,#fa709a,#fee140)';
  if (/camera/.test(n))          return 'linear-gradient(135deg,#43e97b,#38f9d7)';
  return 'linear-gradient(135deg,#a18cd1,#fbc2eb)';
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ManagePhotosModal({ product, onClose, onRefresh }) {
  const [images,    setImages]    = useState(product.imageUrls || []);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const handleAddFiles = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (files.length === 0) return;
    if (images.length + files.length > 4) {
      setError(`Can only add ${4 - images.length} more image(s) — product already has ${images.length}.`);
      return;
    }
    setError(''); setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const res = await api.post(`/api/products/${product.id}/images`, formData, {
        headers: { 'Content-Type': undefined },
      });
      setImages(res.data.data.imageUrls || []);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleRemove = async (url) => {
    if (images.length <= 1) { setError('A product must have at least 1 image.'); return; }
    setError(''); setUploading(true);
    try {
      const res = await api.delete(`/api/products/${product.id}/images`, { data: { imageUrl: url } });
      setImages(res.data.data.imageUrls || []);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Remove failed.');
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>📸 Manage Photos — {product.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <p style={{ fontSize: 13, color: 'var(--text-medium)', marginBottom: 12 }}>
          {images.length}/4 images. Click × to remove. Click + to add more.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
          {images.map((url, i) => (
            <div key={url} style={{ position: 'relative', aspectRatio: '1' }}>
              <img
                src={url}
                alt={`Product ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, display: 'block' }}
              />
              <button
                onClick={() => handleRemove(url)}
                disabled={uploading}
                title="Remove image"
                style={{
                  position: 'absolute', top: 3, right: 3,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: 22, height: 22, cursor: 'pointer',
                  fontSize: 14, lineHeight: '22px', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          ))}

          {images.length < 4 && (
            <label
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                aspectRatio: '1', border: '2px dashed var(--border)',
                borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: 28, color: 'var(--text-muted)',
                background: 'var(--bg)',
              }}
              title="Add more images"
            >
              {uploading ? '⏳' : '+'}
              <input
                type="file" accept="image/*" multiple
                style={{ display: 'none' }}
                onChange={handleAddFiles}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={uploading}>Close</button>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ product, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.put(`/api/products/${product.id}/restock`, { quantity: Number(quantity) });
      onSuccess(`Added ${quantity} units to "${product.name}"`);
    } catch (err) {
      setError(err.response?.data?.message || 'Restock failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>📦 Restock Product</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ color: 'var(--text-medium)', marginBottom: 16, fontSize: 14 }}>
          Current stock for <strong>{product.name}</strong>:{' '}
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{product.stockQuantity} units</span>
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Units to add</label>
            <input
              type="number" min="1" value={quantity} required
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Updating…' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ product, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: product.name, description: product.description || '',
    price: product.price, stockQuantity: product.stockQuantity,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.put(`/api/products/${product.id}`, {
        ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity),
      });
      onSuccess(`"${form.name}" updated successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>✏️ Edit Product</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="number" min="0.01" step="0.01" name="price" value={form.price} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Stock Quantity</label>
              <input type="number" min="0" name="stockQuantity" value={form.stockQuantity} onChange={handleChange} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }) {
  const MAP = {
    PENDING:   { bg: '#fef3c7', color: '#92400e' },
    CONFIRMED: { bg: '#dbeafe', color: '#1e40af' },
    SHIPPED:   { bg: '#ede9fe', color: '#5b21b6' },
    DELIVERED: { bg: '#d1fae5', color: '#065f46' },
    CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = MAP[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      ...s, padding: '3px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.3px',
    }}>
      {status}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM  = { name: '', description: '', price: '', stockQuantity: '' };
const PAGE_SIZE   = 8;
const ORDERS_SIZE = 10;

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,         setTab]         = useState('products');
  const [products,    setProducts]    = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState('');
  const [error,       setError]       = useState('');

  const [restockTarget,     setRestockTarget]     = useState(null);
  const [editTarget,        setEditTarget]        = useState(null);
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [managePhotosTarget, setManagePhotosTarget] = useState(null);

  // Add-product form state
  const [addForm,         setAddForm]         = useState(EMPTY_FORM);
  const [addImages,       setAddImages]       = useState([]);
  const [addPreviews,     setAddPreviews]     = useState([]);
  const [addLoading,      setAddLoading]      = useState(false);
  const [addError,        setAddError]        = useState('');

  const [sellerOrders,     setSellerOrders]     = useState([]);
  const [ordersPage,       setOrdersPage]       = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(0);
  const [ordersTotalItems, setOrdersTotalItems] = useState(0);
  const [ordersLoading,    setOrdersLoading]    = useState(false);
  const [ordersError,      setOrdersError]      = useState('');
  const [updatingOrderId,  setUpdatingOrderId]  = useState(null);

  useEffect(() => {
    if (user && user.role !== 'SELLER') navigate('/products');
  }, [user, navigate]);

  const fetchProducts = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/products/my-products?page=${page}&size=${PAGE_SIZE}`);
      const d   = res.data.data;
      setProducts(d.content || []);
      setCurrentPage(d.currentPage);
      setTotalPages(d.totalPages);
      setTotalItems(d.totalItems);
    } catch { setProducts([]); } finally { setLoading(false); }
  }, []);

  const fetchSellerOrders = useCallback(async (page = 0) => {
    setOrdersLoading(true); setOrdersError('');
    try {
      const res = await api.get(`/api/orders/seller-orders?page=${page}&size=${ORDERS_SIZE}`);
      const d   = res.data.data;
      setSellerOrders(d.content || []);
      setOrdersPage(d.currentPage);
      setOrdersTotalPages(d.totalPages);
      setOrdersTotalItems(d.totalItems);
    } catch (err) {
      setOrdersError(err.response?.data?.message || 'Failed to load orders.');
    } finally { setOrdersLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'products') fetchProducts(0); }, [tab, fetchProducts]);
  useEffect(() => { if (tab === 'orders')   fetchSellerOrders(0); }, [tab, fetchSellerOrders]);

  const showMsg = text => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

  const handleSellerOrderUpdate = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await api.put(`/api/orders/${orderId}/seller-update`, { orderId, status: newStatus });
      showMsg(newStatus === 'SHIPPED' ? 'Order marked as shipped! Customer will be notified.' : 'Order confirmed!');
      fetchSellerOrders(ordersPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status.');
    } finally { setUpdatingOrderId(null); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      showMsg(`"${deleteTarget.name}" deleted`);
      const targetPage = products.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      fetchProducts(targetPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
      setDeleteTarget(null);
    }
  };

  // ── Image selection for the Add Product form ─────────────────────────────

  const handleImageSelect = (e) => {
    const incoming = Array.from(e.target.files);
    e.target.value = '';
    if (incoming.length === 0) return;
    const combined = [...addImages, ...incoming].slice(0, 4);
    if (addImages.length + incoming.length > 4) {
      setAddError(`Max 4 images — you already selected ${addImages.length}, picked ${incoming.length}.`);
    } else {
      setAddError('');
    }
    setAddImages(combined);
    setAddPreviews(combined.map(f => URL.createObjectURL(f)));
  };

  const removePreview = (index) => {
    const imgs  = addImages.filter((_, i) => i !== index);
    const prevs = addPreviews.filter((_, i) => i !== index);
    setAddImages(imgs);
    setAddPreviews(prevs);
    setAddError('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addImages.length === 0) { setAddError('Please upload at least 1 product image.'); return; }
    setAddLoading(true); setAddError('');
    try {
      const productData = {
        name: addForm.name,
        description: addForm.description,
        price: Number(addForm.price),
        stockQuantity: Number(addForm.stockQuantity),
      };
      const formData = new FormData();
      // Send product JSON as a Blob with application/json content-type so Spring's
      // @RequestPart can deserialize it correctly — plain string append wouldn't set the type.
      formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
      addImages.forEach(img => formData.append('images', img));

      // Pass Content-Type: undefined so Axios removes the default application/json header
      // and lets the browser auto-set multipart/form-data with the correct boundary.
      await api.post('/api/products', formData, { headers: { 'Content-Type': undefined } });

      setAddForm(EMPTY_FORM);
      setAddImages([]);
      setAddPreviews([]);
      showMsg(`"${addForm.name}" added successfully!`);
      setTab('products');
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add product.');
    } finally { setAddLoading(false); }
  };

  const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length;
  const outOfStock    = products.filter(p => p.stockQuantity === 0).length;

  function stockBadge(qty) {
    if (qty === 0) return <span className="badge badge-danger" style={{ fontWeight: 700 }}>0 — Out of Stock</span>;
    if (qty < 10)  return <span className="badge badge-warning" style={{ fontWeight: 700 }}>⚠ {qty}</span>;
    return <span className="badge badge-success" style={{ fontWeight: 700 }}>{qty}</span>;
  }

  return (
    <div className="dashboard-wrap">

      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.3px' }}>
            Seller Dashboard
          </h1>
          <span className="badge badge-info" style={{ fontSize: 12 }}>SELLER</span>
        </div>
        <p style={{ color: 'var(--text-medium)', fontSize: 14 }}>
          Welcome back, <strong>{user?.name}</strong> — manage your store here
        </p>
      </div>

      {/* Info banner */}
      <div className="info-banner info-banner-blue">
        <span style={{ flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong>This is your seller account.</strong> Seller accounts are for managing products only.
          To shop, please{' '}
          <a href="/register">register a separate customer account</a>.
        </span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue-border">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{totalItems || '—'}</div>
        </div>
        <div className="stat-card green-border">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{ordersTotalItems || '—'}</div>
        </div>
        <div className="stat-card orange-border">
          <div className="stat-icon">⚠️</div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{lowStockCount}</div>
          <div className="stat-sub">on this page</div>
        </div>
        <div className="stat-card purple-border">
          <div className="stat-icon">❌</div>
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{outOfStock}</div>
          <div className="stat-sub">on this page</div>
        </div>
      </div>

      {/* Alerts */}
      {msg   && <div className="alert alert-success">✓ {msg}</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Tabs */}
      <div className="tabs">
        {[
          ['products', '📋 My Products'],
          ['orders',   '🛒 Orders'],
          ['add',      '➕ Add Product'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn${tab === key ? ' active' : ''}`}
            onClick={() => { setTab(key); setMsg(''); setError(''); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── My Products tab ─────────────────────────────────────────── */}
      {tab === 'products' && (
        loading ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 40 }}>⏳</div>
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No products yet</h3>
            <p>Start building your store by adding your first product.</p>
            <button className="btn btn-primary" onClick={() => setTab('add')}>Add First Product</button>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 52 }}></th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        {p.imageUrls && p.imageUrls.length > 0 ? (
                          <img
                            src={p.imageUrls[0]}
                            alt={p.name}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: 44, height: 44, borderRadius: 6,
                            background: getGradient(p.name),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                          }}>
                            {getEmoji(p.name)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {p.description.length > 60 ? p.description.slice(0, 60) + '…' : p.description}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </td>
                      <td>{stockBadge(p.stockQuantity)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditTarget(p)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-success"         onClick={() => setRestockTarget(p)}>📦 Restock</button>
                          <button className="btn btn-sm"
                            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4 }}
                            onClick={() => setManagePhotosTarget(p)}>
                            📸 Photos
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)}>🗑 Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn page-btn-arrow"
                  onClick={() => fetchProducts(currentPage - 1)} disabled={currentPage === 0}>
                  ← Prev
                </button>
                <span className="page-info">Page {currentPage + 1} of {totalPages}</span>
                <button className="page-btn page-btn-arrow"
                  onClick={() => fetchProducts(currentPage + 1)} disabled={currentPage >= totalPages - 1}>
                  Next →
                </button>
              </div>
            )}
          </>
        )
      )}

      {/* ── Orders tab ──────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)' }}>
              Orders for Your Products
            </h2>
            <p style={{ color: 'var(--text-medium)', fontSize: 13, marginTop: 4 }}>
              Manage and fulfill customer orders
              {ordersTotalItems > 0 && ` — ${ordersTotalItems} order${ordersTotalItems !== 1 ? 's' : ''}`}
            </p>
          </div>

          {ordersLoading ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ fontSize: 40 }}>⏳</div>
              <p>Loading orders…</p>
            </div>
          ) : ordersError ? (
            <div className="alert alert-error">{ordersError}</div>
          ) : sellerOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <h3>No orders yet</h3>
              <p>When customers buy your products, their orders will appear here.</p>
            </div>
          ) : (
            <>
              {sellerOrders.map((order, idx) => (
                <div
                  key={`${order.orderId}-${order.productId}-${idx}`}
                  style={{
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '20px 24px',
                    marginBottom: 12, boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)' }}>
                        Order #{order.orderId}
                      </span>
                      <span style={{ marginLeft: 12, color: 'var(--text-light)', fontSize: 13 }}>
                        📅 {formatDate(order.orderDate)}
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '8px 24px', fontSize: 14, marginBottom: 16 }}>
                    <div>
                      <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: 12 }}>CUSTOMER</span><br />
                      <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>{order.customerEmail}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: 12 }}>PRODUCT</span><br />
                      <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>{order.productName} × {order.quantity}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: 12 }}>AMOUNT</span><br />
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>{formatAmount(order.subtotal)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {order.status === 'PENDING' && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleSellerOrderUpdate(order.orderId, 'CONFIRMED')}
                      >
                        {updatingOrderId === order.orderId ? 'Updating…' : '✓ Confirm Order'}
                      </button>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4 }}
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleSellerOrderUpdate(order.orderId, 'SHIPPED')}
                      >
                        {updatingOrderId === order.orderId ? 'Updating…' : '🚚 Mark as Shipped'}
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <span style={{ fontSize: 13, color: '#5b21b6', fontWeight: 700 }}>✓ Shipped</span>
                    )}
                    {order.status === 'DELIVERED' && (
                      <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>✓ Delivered</span>
                    )}
                    {order.status === 'CANCELLED' && (
                      <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>Cancelled</span>
                    )}
                  </div>
                </div>
              ))}

              {ordersTotalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn page-btn-arrow"
                    onClick={() => fetchSellerOrders(ordersPage - 1)} disabled={ordersPage === 0}>
                    ← Prev
                  </button>
                  <span className="page-info">Page {ordersPage + 1} of {ordersTotalPages}</span>
                  <button className="page-btn page-btn-arrow"
                    onClick={() => fetchSellerOrders(ordersPage + 1)} disabled={ordersPage >= ordersTotalPages - 1}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Add Product tab ──────────────────────────────────────────── */}
      {tab === 'add' && (
        <div style={{
          maxWidth: 600, background: '#fff', borderRadius: 12,
          padding: 28, boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-dark)' }}>
            Add New Product
          </h2>
          {addError && <div className="alert alert-error">{addError}</div>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Product Name</label>
              <input
                name="name" value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Wireless Headphones" required
              />
            </div>
            <div className="form-group">
              <label>
                Description
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(optional)</span>
              </label>
              <textarea
                name="description" value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Brief product description" rows={3}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  type="number" min="0.01" step="0.01" name="price" value={addForm.price}
                  onChange={e => setAddForm({ ...addForm, price: e.target.value })}
                  placeholder="0.00" required
                />
              </div>
              <div className="form-group">
                <label>Initial Stock</label>
                <input
                  type="number" min="0" name="stockQuantity" value={addForm.stockQuantity}
                  onChange={e => setAddForm({ ...addForm, stockQuantity: e.target.value })}
                  placeholder="0" required
                />
              </div>
            </div>

            {/* ── Image upload area ─────────────────────────────────── */}
            <div className="form-group">
              <label>
                Product Images
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                  (1–4 images, max 10 MB each)
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                {addPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePreview(i)}
                      style={{
                        position: 'absolute', top: 3, right: 3,
                        background: 'rgba(0,0,0,0.65)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: 22, height: 22, cursor: 'pointer',
                        fontSize: 14, lineHeight: '22px', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ))}

                {addPreviews.length < 4 && (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', aspectRatio: '1',
                    border: '2px dashed var(--border)', borderRadius: 6,
                    cursor: 'pointer', color: 'var(--text-muted)', background: 'var(--bg)',
                  }}>
                    <span style={{ fontSize: 26 }}>📷</span>
                    <span style={{ fontSize: 11, marginTop: 4 }}>Add photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {addPreviews.length}/4 selected.
                {addPreviews.length === 0 && ' At least 1 image is required.'}
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={addLoading}
            >
              {addLoading ? (
                <span>⏳ Uploading images &amp; saving…</span>
              ) : '➕ Add Product'}
            </button>
          </form>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {managePhotosTarget && (
        <ManagePhotosModal
          product={managePhotosTarget}
          onClose={() => setManagePhotosTarget(null)}
          onRefresh={() => fetchProducts(currentPage)}
        />
      )}
      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSuccess={m => { setRestockTarget(null); showMsg(m); fetchProducts(currentPage); }}
        />
      )}
      {editTarget && (
        <EditModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={m => { setEditTarget(null); showMsg(m); fetchProducts(currentPage); }}
        />
      )}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>🗑 Delete Product</h3>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-medium)', fontSize: 14, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
