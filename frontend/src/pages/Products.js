import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoginPromptModal from '../components/LoginPromptModal';

const PAGE_SIZE = 16;

function getEmoji(name = '') {
  const n = name.toLowerCase();
  if (/phone|mobile|iphone|samsung|oneplus|oppo|vivo|pixel/.test(n)) return '📱';
  if (/laptop|macbook|dell|hp|lenovo|asus|notebook/.test(n))          return '💻';
  if (/tv|television|monitor|screen|display/.test(n))                  return '📺';
  if (/headphone|earphone|airpod|earbud|speaker|audio/.test(n))       return '🎧';
  if (/camera|dslr|gopro/.test(n))                                     return '📷';
  if (/watch|smartwatch/.test(n))                                      return '⌚';
  if (/tablet|ipad/.test(n))                                           return '📱';
  if (/keyboard|mouse|gaming/.test(n))                                 return '🎮';
  if (/shoe|boot|sneaker/.test(n))                                     return '👟';
  if (/shirt|tshirt|cloth|dress|jeans/.test(n))                       return '👕';
  if (/book|novel/.test(n))                                            return '📚';
  if (/bag|backpack|purse/.test(n))                                    return '👜';
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

function fakeRating(id) {
  const x = (Math.sin(Number(id) * 127.1 + 311.7) + 1) / 2;
  return (3.5 + x * 1.4).toFixed(1);
}
function fakeReviews(id) {
  const x = (Math.sin(Number(id) * 311.7 + 127.1) + 1) / 2;
  return Math.floor(50 + x * 1950);
}
function fakeDiscount(id) {
  const x = (Math.sin(Number(id) * 211.3) + 1) / 2;
  return Math.floor(10 + x * 18);
}

function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, 4, '…', total - 1];
  if (current >= total - 4) return [0, '…', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '…', current - 1, current, current + 1, '…', total - 1];
}

const SORTS = [
  { label: 'Newest First',       sortBy: 'createdAt', sortDir: 'desc' },
  { label: 'Price: Low to High', sortBy: 'price',     sortDir: 'asc'  },
  { label: 'Price: High to Low', sortBy: 'price',     sortDir: 'desc' },
  { label: 'Name A–Z',           sortBy: 'name',      sortDir: 'asc'  },
];

const PRICE_RANGES = [
  { label: 'Under ₹500',         min: '',      max: '500'   },
  { label: '₹500 – ₹2,000',     min: '500',   max: '2000'  },
  { label: '₹2,000 – ₹10,000',  min: '2000',  max: '10000' },
  { label: 'Above ₹10,000',      min: '10000', max: ''      },
];

const DEFAULT_FILTERS = { search: '', minPrice: '', maxPrice: '', inStockOnly: false, sortIndex: 0 };

function getCart()      { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); window.dispatchEvent(new Event('cartUpdated')); }

function SkeletonGrid() {
  return (
    <div className="p-grid">
      {Array(8).fill(null).map((_, i) => (
        <div key={i} className="p-card" style={{ cursor: 'default' }}>
          <div className="p-card-img" style={{ position: 'relative' }}>
            <span className="skeleton sk-img" />
          </div>
          <div className="p-card-body">
            <span className="skeleton sk-line" />
            <span className="skeleton sk-line" style={{ width: '70%' }} />
            <span className="skeleton sk-price" />
          </div>
          <div style={{ height: 42, margin: 0 }} className="skeleton" />
        </div>
      ))}
    </div>
  );
}

export default function Products() {
  const [products, setProducts]             = useState([]);
  const [currentPage, setCurrentPage]       = useState(0);
  const [totalPages, setTotalPages]         = useState(0);
  const [totalItems, setTotalItems]         = useState(0);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [addedId, setAddedId]               = useState(null);
  const [filters, setFilters]               = useState(DEFAULT_FILTERS);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const isSeller = user?.role === 'SELLER';
  const isAdmin  = user?.role === 'ADMIN';

  const buildUrl = useCallback((f, page) => {
    const s = SORTS[f.sortIndex];
    const p = new URLSearchParams({ page, size: PAGE_SIZE, sortBy: s.sortBy, sortDir: s.sortDir, inStockOnly: f.inStockOnly });
    if (f.search)   p.set('search',   f.search);
    if (f.minPrice) p.set('minPrice', f.minPrice);
    if (f.maxPrice) p.set('maxPrice', f.maxPrice);
    return `/api/products?${p}`;
  }, []);

  const fetchProducts = useCallback((activeFilters, page) => {
    setLoading(true);
    api.get(buildUrl(activeFilters, page))
      .then(res => {
        const d = res.data.data;
        setProducts(d.content);
        setCurrentPage(d.currentPage);
        setTotalPages(d.totalPages);
        setTotalItems(d.totalItems);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q) {
      const initial = { ...DEFAULT_FILTERS, search: q };
      setFilters(initial);
      fetchProducts(initial, 0);
    } else {
      fetchProducts(DEFAULT_FILTERS, 0);
    }
  }, [fetchProducts, searchParams]);

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchProducts(next, 0);
  };

  const setPriceRange = (min, max) => {
    const next = { ...filters, minPrice: min, maxPrice: max };
    setFilters(next);
    fetchProducts(next, 0);
  };

  const activePriceRange = PRICE_RANGES.find(r => r.min === filters.minPrice && r.max === filters.maxPrice);

  const clearFilters = () => {
    const cleared = { ...DEFAULT_FILTERS, search: filters.search };
    setFilters(cleared);
    fetchProducts(cleared, 0);
  };

  const clearSearch = () => {
    setFilters(DEFAULT_FILTERS);
    fetchProducts(DEFAULT_FILTERS, 0);
    navigate('/products', { replace: true });
  };

  const goToPage = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProducts(filters, page);
  };

  const addToCart = (product, e) => {
    e.stopPropagation();
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const cart = getCart();
    const existing = cart.find(i => i.productId === product.id);
    if (existing) { existing.quantity += 1; } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    }
    saveCart(cart);
    setAddedId(product.id);
    showToast(`${product.name} added to cart`);
    setTimeout(() => setAddedId(null), 1500);
  };

  const hasNonSearchFilters = filters.minPrice || filters.maxPrice || filters.inStockOnly || filters.sortIndex !== 0;

  if (error) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchProducts(DEFAULT_FILTERS, 0)}>Try Again</button>
      </div>
    </div>
  );

  return (
    <>
      {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}

      <div className="products-page">

        {/* ── Filter Sidebar ────────────────────────────────────────── */}
        <aside className="filter-sidebar">
          <div className="filter-header">
            <span>Filters</span>
            {hasNonSearchFilters && (
              <button className="filter-clear" onClick={clearFilters}>CLEAR ALL</button>
            )}
          </div>

          <div className="filter-section">
            <div className="filter-section-title">Price Range</div>
            <div className="price-chips">
              {PRICE_RANGES.map(r => (
                <button
                  key={r.label}
                  className={`price-chip${activePriceRange === r ? ' active' : ''}`}
                  onClick={() => activePriceRange === r ? setPriceRange('', '') : setPriceRange(r.min, r.max)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="price-inputs">
              <input
                type="number" min="0" placeholder="Min ₹"
                value={filters.minPrice}
                onChange={e => handleFilterChange('minPrice', e.target.value)}
              />
              <span>—</span>
              <input
                type="number" min="0" placeholder="Max ₹"
                value={filters.maxPrice}
                onChange={e => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-title">Availability</div>
            <div className="filter-opts">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={e => handleFilterChange('inStockOnly', e.target.checked)}
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-title">Sort By</div>
            <div className="filter-opts">
              {SORTS.map((s, i) => (
                <label key={i} className="filter-radio">
                  <input
                    type="radio" name="sort" value={i}
                    checked={filters.sortIndex === i}
                    onChange={() => handleFilterChange('sortIndex', i)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Products Main Panel ───────────────────────────────────── */}
        <main className="products-main">

          <div className="results-bar">
            <span className="results-count">
              {loading ? 'Loading…' : (
                <>
                  <strong>{totalItems.toLocaleString('en-IN')}</strong>{' '}
                  result{totalItems !== 1 ? 's' : ''}
                  {filters.search && (
                    <> for{' '}
                      <span className="active-search-chip">
                        {filters.search}
                        <button className="chip-close" onClick={clearSearch}>×</button>
                      </span>
                    </>
                  )}
                </>
              )}
            </span>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No results found{filters.search ? ` for "${filters.search}"` : ''}</h3>
              <p>Try different keywords or remove filters</p>
              {(filters.search || hasNonSearchFilters) && (
                <button className="btn btn-primary" onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  fetchProducts(DEFAULT_FILTERS, 0);
                  navigate('/products', { replace: true });
                }}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="p-grid">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="p-card"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <div
                      className="p-card-img"
                      style={{ background: product.imageUrls?.length > 0 ? '#f0f0f0' : getGradient(product.name) }}
                    >
                      {product.imageUrls?.length > 0 ? (
                        <img
                          src={product.imageUrls[0]}
                          alt={product.name}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.3s' }}
                          onLoad={e => { e.currentTarget.style.opacity = 1; }}
                        />
                      ) : (
                        <span className="p-card-emoji">{getEmoji(product.name)}</span>
                      )}
                      <span className={`p-card-stock badge ${
                        product.stockQuantity === 0 ? 'badge-danger'
                        : product.stockQuantity <= 10 ? 'badge-warning'
                        : 'badge-success'
                      }`}>
                        {product.stockQuantity === 0 ? 'Out of Stock'
                          : product.stockQuantity <= 10 ? `Only ${product.stockQuantity} left`
                          : 'In Stock'}
                      </span>
                      <div className="p-card-img-overlay">
                        <button
                          className="p-card-quick-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
                        >
                          👁 Quick View
                        </button>
                      </div>
                      <button className="p-card-wishlist" onClick={e => e.stopPropagation()}>♡</button>
                    </div>
                    <div className="p-card-body">
                      {product.sellerName && (
                        <div className="p-card-seller">🏪 {product.sellerName}</div>
                      )}
                      <div className="p-card-name">{product.name}</div>
                      <div className="p-card-desc">{product.description}</div>
                      <div className="p-card-rating">
                        ⭐ {fakeRating(product.id)}{' '}
                        <span style={{ color: 'var(--text-light)' }}>({fakeReviews(product.id).toLocaleString('en-IN')})</span>
                      </div>
                      <div className="p-card-price-row">
                        <span className="p-card-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                        <span className="p-card-mrp">₹{Math.floor(product.price * (1 + fakeDiscount(product.id) / 100)).toLocaleString('en-IN')}</span>
                        <span className="p-card-off">{fakeDiscount(product.id)}% off</span>
                      </div>
                    </div>
                    {isSeller || isAdmin ? (
                      <span className="p-card-restrict">
                        {isAdmin ? 'Admin cannot purchase' : 'Use customer account'}
                      </span>
                    ) : (
                      <button
                        className={`p-card-btn${addedId === product.id ? ' added' : ''}`}
                        disabled={product.stockQuantity === 0}
                        onClick={e => addToCart(product, e)}
                      >
                        {addedId === product.id ? '✓ ADDED!' : 'ADD TO CART'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn page-btn-arrow"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                  >← Prev</button>
                  {pageRange(currentPage, totalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="page-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`page-btn${p === currentPage ? ' active' : ''}`}
                        onClick={() => goToPage(p)}
                      >{p + 1}</button>
                    )
                  )}
                  <button
                    className="page-btn page-btn-arrow"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >Next →</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
