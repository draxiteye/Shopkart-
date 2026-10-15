import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Eye, ShoppingCart, ArrowRight, AlertCircle, ShoppingBag, Check, Sparkles } from 'lucide-react';
import { getWishlist, removeFromWishlist } from '../services/api';
import { useCart } from '../context/CartContext';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [addedMap, setAddedMap] = useState({});

  const { addToCart } = useCart();

  const fetchWishlistItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWishlist();
      setItems(data.wishlist || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistItems();
  }, []);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => item._id !== productId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove product from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (product) => {
    if (product.stock <= 0) return;
    setAddingId(product._id);
    const res = await addToCart(product._id);
    if (res.success) {
      setAddedMap((prev) => ({ ...prev, [product._id]: true }));
      setTimeout(() => {
        setAddedMap((prev) => ({ ...prev, [product._id]: false }));
      }, 1500);
    } else {
      alert(res.message);
    }
    setAddingId(null);
  };

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Heart size={26} color="#ef4444" fill="#ef4444" />
          <span>My Wishlist</span>
          {items.length > 0 && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--bg-main)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </h1>
        <p className="page-subtitle">
          Keep track of products you love and move them to your cart anytime.
        </p>
      </div>

      {loading ? (
        <div className="state-box">
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading your saved items...</p>
        </div>
      ) : error ? (
        <div className="state-box" style={{ borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem', fontWeight: 700 }}>Unable to load wishlist</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <button onClick={fetchWishlistItems} className="btn btn-outline">
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="state-box">
          <Heart className="state-icon" style={{ color: '#cbd5e1' }} />
          <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Your wishlist is empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
            Tap the heart icon on any product in our store to save it here for later purchases.
          </p>
          <Link to="/products" className="btn btn-primary">
            <ShoppingBag size={16} />
            <span>Discover Products</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="products-grid">
          {items.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isAdded = !!addedMap[product._id];
            const isRemoving = removingId === product._id;

            return (
              <div key={product._id} className="product-card">
                <div className="product-img-wrapper">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    className="product-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <span className="product-badge">{product.category}</span>
                  
                  {/* Quick Remove Top-Right */}
                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={isRemoving}
                    className="wishlist-btn"
                    title="Remove from wishlist"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="product-body">
                  <h3 className="product-title">{product.name}</h3>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div className="product-price">₹{product.price.toLocaleString('en-IN')}</div>
                    <div className={`product-stock ${isOutOfStock ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-in'}`}>
                      {isOutOfStock ? '• Out of Stock' : isLowStock ? `• Only ${product.stock} left` : '• In Stock'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                    <Link
                      to={`/products/${product._id}`}
                      className="btn btn-outline"
                      style={{ padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </Link>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock || addingId === product._id}
                      className={`btn ${isAdded ? 'btn-success' : 'btn-primary'}`}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {addingId === product._id ? (
                        <span>Adding...</span>
                      ) : isAdded ? (
                        <>
                          <Check size={14} />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
