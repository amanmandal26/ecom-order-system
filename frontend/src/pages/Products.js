import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const PAGE_SIZE = 6;

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export default function Products() {
  const [products, setProducts]       = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalItems, setTotalItems]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [addedId, setAddedId]         = useState(null);

  const fetchPage = useCallback((page) => {
    setLoading(true);
    api.get(`/api/products?page=${page}&size=${PAGE_SIZE}&sortBy=createdAt&sortDir=desc`)
      .then((res) => {
        const paged = res.data.data;
        setProducts(paged.content);
        setCurrentPage(paged.currentPage);
        setTotalPages(paged.totalPages);
        setTotalItems(paged.totalItems);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const goToPage = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPage(page);
  };

  const addToCart = (product) => {
    const cart = getCart();
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    }
    saveCart(cart);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  if (loading) return <div className="page-loading">Loading products...</div>;
  if (error)   return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">
        Products
        {totalItems > 0 && (
          <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#888', marginLeft: '0.75rem' }}>
            ({totalItems} total)
          </span>
        )}
      </h1>

      {products.length === 0 ? (
        <p className="empty-state">No products available.</p>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-card-body">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  {product.sellerName && (
                    <p style={{ fontSize: '0.78rem', color: '#888', margin: '-4px 0 6px' }}>
                      Sold by: {product.sellerName}
                    </p>
                  )}
                  <div className="product-meta">
                    <span className="product-price">${Number(product.price).toFixed(2)}</span>
                    <span className={`product-stock ${product.stockQuantity === 0 ? 'out-of-stock' : ''}`}>
                      {product.stockQuantity === 0 ? 'Out of stock' : `${product.stockQuantity} in stock`}
                    </span>
                  </div>
                </div>
                <div className="product-card-footer">
                  <button
                    className={`btn ${addedId === product.id ? 'btn-success' : 'btn-primary'} btn-full`}
                    onClick={() => addToCart(product)}
                    disabled={product.stockQuantity === 0}
                  >
                    {addedId === product.id ? 'Added!' : 'Add to Cart'}
                  </button>
                </div>
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
