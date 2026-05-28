import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const PAGE_SIZE = 6;

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

const SORT_OPTIONS = [
  { label: 'Newest',              sortBy: 'createdAt', sortDir: 'desc' },
  { label: 'Price: Low to High',  sortBy: 'price',     sortDir: 'asc'  },
  { label: 'Price: High to Low',  sortBy: 'price',     sortDir: 'desc' },
  { label: 'Name A–Z',            sortBy: 'name',      sortDir: 'asc'  },
];

const DEFAULT_FILTERS = {
  search:      '',
  minPrice:    '',
  maxPrice:    '',
  inStockOnly: false,
  sellerName:  '',
  sortIndex:   0,
};

export default function Products() {
  const [products, setProducts]       = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalItems, setTotalItems]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [addedId, setAddedId]         = useState(null);

  // Filters — committed means "what was last searched"
  const [filters, setFilters]           = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput]   = useState('');   // live text in the search box

  const buildQuery = useCallback((f, page) => {
    const sort = SORT_OPTIONS[f.sortIndex];
    const params = new URLSearchParams({
      page,
      size: PAGE_SIZE,
      sortBy:  sort.sortBy,
      sortDir: sort.sortDir,
      inStockOnly: f.inStockOnly,
    });
    if (f.search)     params.set('search',     f.search);
    if (f.minPrice)   params.set('minPrice',   f.minPrice);
    if (f.maxPrice)   params.set('maxPrice',   f.maxPrice);
    if (f.sellerName) params.set('sellerName', f.sellerName);
    return `/api/products?${params.toString()}`;
  }, []);

  const fetchProducts = useCallback((activeFilters, page) => {
    setLoading(true);
    api.get(buildQuery(activeFilters, page))
      .then((res) => {
        const paged = res.data.data;
        setProducts(paged.content);
        setCurrentPage(paged.currentPage);
        setTotalPages(paged.totalPages);
        setTotalItems(paged.totalItems);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  // Initial load
  useEffect(() => {
    fetchProducts(DEFAULT_FILTERS, 0);
  }, [fetchProducts]);

  const applySearch = () => {
    const next = { ...filters, search: searchInput.trim() };
    setFilters(next);
    fetchProducts(next, 0);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') applySearch();
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchProducts(next, 0);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters(DEFAULT_FILTERS);
    fetchProducts(DEFAULT_FILTERS, 0);
  };

  const goToPage = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProducts(filters, page);
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

  const hasActiveFilters =
    filters.search || filters.minPrice || filters.maxPrice ||
    filters.inStockOnly || filters.sellerName || filters.sortIndex !== 0;

  if (error) return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">Products</h1>

      {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
      <div style={searchBarCard}>
        {/* Row 1: search input */}
        <div style={searchRow}>
          <input
            type="text"
            placeholder="Search products by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={searchInput_style}
          />
          <button className="btn btn-primary" onClick={applySearch} style={{ minWidth: 90 }}>
            Search
          </button>
        </div>

        {/* Row 2: filters */}
        <div style={filterRow}>
          <label style={filterLabel}>
            Min ₹
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              style={filterInput}
            />
          </label>

          <label style={filterLabel}>
            Max ₹
            <input
              type="number"
              min="0"
              placeholder="any"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              style={filterInput}
            />
          </label>

          <label style={{ ...filterLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => handleFilterChange('inStockOnly', e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
            In Stock Only
          </label>

          <label style={filterLabel}>
            Sort
            <select
              value={filters.sortIndex}
              onChange={(e) => handleFilterChange('sortIndex', Number(e.target.value))}
              style={{ ...filterInput, cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map((opt, i) => (
                <option key={i} value={i}>{opt.label}</option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <button className="btn btn-outline" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Result Count ────────────────────────────────────────────────── */}
      {!loading && (
        <p style={resultCount}>
          {totalItems === 0
            ? filters.search
              ? `No products found for "${filters.search}"`
              : 'No products available.'
            : `Showing ${products.length} of ${totalItems} product${totalItems !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* ── Product Grid ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="page-loading">Loading products...</div>
      ) : products.length === 0 ? (
        <p className="empty-state" style={{ marginTop: '1rem' }}>
          {filters.search ? `Try a different keyword.` : 'No products match the selected filters.'}
        </p>
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
                    <span className="product-price">₹{Number(product.price).toFixed(2)}</span>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const searchBarCard = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '1rem 1.25rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const searchRow = {
  display: 'flex',
  gap: '0.5rem',
};

const searchInput_style = {
  flex: 1,
  padding: '0.55rem 0.85rem',
  border: '1px solid #cbd5e0',
  borderRadius: 6,
  fontSize: '0.95rem',
  outline: 'none',
};

const filterRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
};

const filterLabel = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#555',
  gap: 3,
};

const filterInput = {
  padding: '0.4rem 0.6rem',
  border: '1px solid #cbd5e0',
  borderRadius: 6,
  fontSize: '0.9rem',
  width: 110,
};

const resultCount = {
  fontSize: '0.88rem',
  color: '#666',
  margin: '0 0 0.75rem',
};

const paginationStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1.25rem',
  marginTop: '2rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e9ecef',
};
