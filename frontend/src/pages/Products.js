import React, { useEffect, useState } from 'react';
import api from '../services/api';

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    api.get('/api/products')
      .then((res) => setProducts(res.data.data))
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

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
  if (error) return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">Products</h1>
      {products.length === 0 ? (
        <p className="empty-state">No products available.</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-card-body">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
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
      )}
    </div>
  );
}
