import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Small sub-components ──────────────────────────────────────────────────────

function RestockModal({ product, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put(`/api/products/${product.id}/restock`, { quantity: Number(quantity) });
      onSuccess(`Added ${quantity} units to "${product.name}"`);
    } catch (err) {
      setError(err.response?.data?.message || 'Restock failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginBottom: '0.5rem' }}>Restock Product</h3>
        <p style={{ color: '#555', marginBottom: '1rem' }}>
          Current stock for <strong>{product.name}</strong>: {product.stockQuantity} units
        </p>
        {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Units to add</label>
            <input
              type="number" min="1" value={quantity} required
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
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
    name:          product.name,
    description:   product.description || '',
    price:         product.price,
    stockQuantity: product.stockQuantity,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put(`/api/products/${product.id}`, {
        ...form,
        price:         Number(form.price),
        stockQuantity: Number(form.stockQuantity),
      });
      onSuccess(`"${form.name}" updated successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginBottom: '1rem' }}>Edit Product</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description" value={form.description} onChange={handleChange} rows={2}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <div className="form-group">
            <label>Price ($)</label>
            <input type="number" min="0.01" step="0.01" name="price" value={form.price} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" min="0" name="stockQuantity" value={form.stockQuantity} onChange={handleChange} required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main SellerDashboard ──────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', description: '', price: '', stockQuantity: '' };
const PAGE_SIZE  = 5;

export default function SellerDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [tab, setTab]           = useState('products');
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalItems, setTotalItems]   = useState(0);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');

  const [restockTarget, setRestockTarget] = useState(null);
  const [editTarget, setEditTarget]       = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);

  const [addForm, setAddForm]     = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]   = useState('');

  // Guard: only SELLERs
  useEffect(() => {
    if (user && user.role !== 'SELLER') navigate('/products');
  }, [user, navigate]);

  const fetchProducts = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/products/my-products?page=${page}&size=${PAGE_SIZE}`);
      const paged = res.data.data;
      setProducts(paged.content || []);
      setCurrentPage(paged.currentPage);
      setTotalPages(paged.totalPages);
      setTotalItems(paged.totalItems);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'products') fetchProducts(0);
  }, [tab, fetchProducts]);

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      showMsg(`"${deleteTarget.name}" deleted`);
      // If we deleted the last item on this page, go back one page
      const targetPage = products.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      fetchProducts(targetPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
      setDeleteTarget(null);
    }
  };

  // ── Add Product ───────────────────────────────────────────────────────────
  const handleAddChange = (e) => setAddForm({ ...addForm, [e.target.name]: e.target.value });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/api/products', {
        ...addForm,
        price:         Number(addForm.price),
        stockQuantity: Number(addForm.stockQuantity),
      });
      setAddForm(EMPTY_FORM);
      showMsg(`"${addForm.name}" added successfully!`);
      setTab('products');
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add product.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Seller Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Welcome, <strong>{user?.name}</strong> — manage your products here
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[['products', 'My Products'], ['add', 'Add Product']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setMsg(''); setError(''); }}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-outline'}`}>
            {label}
          </button>
        ))}
      </div>

      {msg   && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg}</div>}
      {error && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ── My Products tab ─────────────────────────────────────────────── */}
      {tab === 'products' && (
        <>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            My Products ({totalItems})
          </h2>
          {loading ? <p>Loading...</p> : products.length === 0 ? (
            <p style={{ color: '#888' }}>
              You have no products yet.{' '}
              <button className="btn btn-outline" style={{ padding: '2px 12px' }}
                onClick={() => setTab('add')}>Add your first product</button>
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                    {['Name', 'Price', 'Stock', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', borderBottom: '2px solid #e9ecef' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{p.name}</strong>
                        {p.description && <div style={{ fontSize: '0.8rem', color: '#888' }}>{p.description}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>${Number(p.price).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: p.stockQuantity === 0 ? '#ef4444' : p.stockQuantity < 10 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                          {p.stockQuantity}
                        </span>
                        {p.stockQuantity < 10 && p.stockQuantity > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '6px' }}>Low stock</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-outline" style={{ padding: '3px 12px', fontSize: '0.82rem' }}
                            onClick={() => setEditTarget(p)}>Edit</button>
                          <button className="btn btn-primary" style={{ padding: '3px 12px', fontSize: '0.82rem' }}
                            onClick={() => setRestockTarget(p)}>Restock</button>
                          <button className="btn btn-outline"
                            style={{ padding: '3px 12px', fontSize: '0.82rem', color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => setDeleteTarget(p)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem 0 0.5rem' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => fetchProducts(currentPage - 1)}
                    disabled={currentPage === 0}
                    style={{ padding: '4px 14px' }}
                  >
                    ← Previous
                  </button>
                  <span style={{ color: '#555', fontSize: '0.9rem' }}>
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    className="btn btn-outline"
                    onClick={() => fetchProducts(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    style={{ padding: '4px 14px' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Product tab ─────────────────────────────────────────────── */}
      {tab === 'add' && (
        <div style={{ maxWidth: '500px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Add New Product</h2>
          {addError && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{addError}</div>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Product Name</label>
              <input name="name" value={addForm.name} onChange={handleAddChange} placeholder="e.g. Wireless Headphones" required />
            </div>
            <div className="form-group">
              <label>Description <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
              <textarea name="description" value={addForm.description} onChange={handleAddChange}
                placeholder="Brief product description" rows={3}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div className="form-group">
              <label>Price ($)</label>
              <input type="number" min="0.01" step="0.01" name="price" value={addForm.price}
                onChange={handleAddChange} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label>Initial Stock</label>
              <input type="number" min="0" name="stockQuantity" value={addForm.stockQuantity}
                onChange={handleAddChange} placeholder="0" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add Product'}
            </button>
          </form>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSuccess={(m) => { setRestockTarget(null); showMsg(m); fetchProducts(currentPage); }}
        />
      )}

      {editTarget && (
        <EditModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(m) => { setEditTarget(null); showMsg(m); fetchProducts(currentPage); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: '380px' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Delete Product</h3>
            <p style={{ color: '#555', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared modal styles ───────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: '#fff', borderRadius: '12px', padding: '2rem',
  width: '460px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
