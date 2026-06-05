import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ── Modals ────────────────────────────────────────────────────────────────────

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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Current stock for <strong>{product.name}</strong>: {product.stockQuantity} units
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Units to add</label>
            <input type="number" min="1" value={quantity} required
              onChange={e => setQuantity(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Updating...' : 'Add Stock'}
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

  const handleChange  = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit  = async (e) => {
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
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', description: '', price: '', stockQuantity: '' };
const PAGE_SIZE  = 8;

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,        setTab]        = useState('products');
  const [products,   setProducts]   = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [msg,        setMsg]        = useState('');
  const [error,      setError]      = useState('');

  const [restockTarget, setRestockTarget] = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  const [addForm,    setAddForm]    = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError,   setAddError]   = useState('');

  useEffect(() => {
    if (user && user.role !== 'SELLER') navigate('/products');
  }, [user, navigate]);

  const fetchProducts = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const res  = await api.get(`/api/products/my-products?page=${page}&size=${PAGE_SIZE}`);
      const d    = res.data.data;
      setProducts(d.content || []);
      setCurrentPage(d.currentPage);
      setTotalPages(d.totalPages);
      setTotalItems(d.totalItems);
    } catch { setProducts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'products') fetchProducts(0); }, [tab, fetchProducts]);

  const showMsg = text => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true); setAddError('');
    try {
      await api.post('/api/products', { ...addForm, price: Number(addForm.price), stockQuantity: Number(addForm.stockQuantity) });
      setAddForm(EMPTY_FORM);
      showMsg(`"${addForm.name}" added successfully!`);
      setTab('products');
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add product.');
    } finally { setAddLoading(false); }
  };

  // Compute stats from loaded products
  const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length;
  const outOfStock    = products.filter(p => p.stockQuantity === 0).length;

  function stockBadge(qty) {
    if (qty === 0)  return <span className="badge badge-danger">Out of Stock</span>;
    if (qty < 10)   return <span className="badge badge-warning">⚠ {qty}</span>;
    return <span className="badge badge-success">{qty}</span>;
  }

  return (
    <div className="dashboard-wrap">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.3px' }}>Seller Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Welcome, <strong>{user?.name}</strong> — manage your store here
        </p>
      </div>

      {/* Seller-only info banner */}
      <div style={{
        background: 'var(--info-light)',
        border: '1px solid #BFDBFE',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#1d4ed8',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
      }}>
        <span style={{ flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong>This is your seller account.</strong> Seller accounts are for managing products only.
          To shop on EcomShop, please{' '}
          <a href="/register" style={{ color: '#1d4ed8', fontWeight: 600 }}>register a separate customer account</a>.
        </span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{totalItems}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{lowStockCount}</div>
          <div className="stat-sub">on this page</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{outOfStock}</div>
          <div className="stat-sub">on this page</div>
        </div>
      </div>

      {/* Alerts */}
      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        {[['products', '📋 My Products'], ['add', '➕ Add Product']].map(([key, label]) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`}
            onClick={() => { setTab(key); setMsg(''); setError(''); }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── My Products tab ─────────────────────────────────────────── */}
      {tab === 'products' && (
        <>
          {loading ? (
            <div className="page-loading" style={{ minHeight: '30vh' }}>⏳ Loading products...</div>
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
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {p.description.length > 60 ? p.description.slice(0, 60) + '…' : p.description}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          ₹{Number(p.price).toFixed(2)}
                        </td>
                        <td>{stockBadge(p.stockQuantity)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => setEditTarget(p)}>✏️ Edit</button>
                            <button className="btn btn-sm btn-success"         onClick={() => setRestockTarget(p)}>📦 Restock</button>
                            <button className="btn btn-sm btn-danger"          onClick={() => setDeleteTarget(p)}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn-ghost page-btn page-btn-arrow"
                    onClick={() => fetchProducts(currentPage - 1)} disabled={currentPage === 0}>
                    ← Prev
                  </button>
                  <span className="page-info">Page {currentPage + 1} of {totalPages}</span>
                  <button className="btn-ghost page-btn page-btn-arrow"
                    onClick={() => fetchProducts(currentPage + 1)} disabled={currentPage >= totalPages - 1}>
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
        <div style={{ maxWidth: 520, background: 'var(--bg-white)', borderRadius: 12, padding: '1.75rem', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add New Product</h2>
          {addError && <div className="alert alert-error">{addError}</div>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Product Name</label>
              <input name="name" value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Wireless Headphones" required />
            </div>
            <div className="form-group">
              <label>Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <textarea name="description" value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Brief product description" rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" min="0.01" step="0.01" name="price" value={addForm.price}
                  onChange={e => setAddForm({ ...addForm, price: e.target.value })}
                  placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label>Initial Stock</label>
                <input type="number" min="0" name="stockQuantity" value={addForm.stockQuantity}
                  onChange={e => setAddForm({ ...addForm, stockQuantity: e.target.value })}
                  placeholder="0" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={addLoading}>
              {addLoading ? 'Adding...' : '➕ Add Product'}
            </button>
          </form>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {restockTarget && (
        <RestockModal product={restockTarget} onClose={() => setRestockTarget(null)}
          onSuccess={m => { setRestockTarget(null); showMsg(m); fetchProducts(currentPage); }} />
      )}
      {editTarget && (
        <EditModal product={editTarget} onClose={() => setEditTarget(null)}
          onSuccess={m => { setEditTarget(null); showMsg(m); fetchProducts(currentPage); }} />
      )}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>🗑 Delete Product</h3>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              This cannot be undone.
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
