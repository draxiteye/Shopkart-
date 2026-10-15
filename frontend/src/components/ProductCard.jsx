import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, ShoppingCart, Check } from 'lucide-react';
import { addToWishlist, removeFromWishlist } from '../services/api';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, inWishlist = false, onWishlistChange }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [wishlisted, setWishlisted] = useState(inWishlist);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [addedAnimation, setAddedAnimation] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistLoading) return;

    setWishlistLoading(true);
    setActionError('');

    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        setWishlisted(false);
        if (onWishlistChange) onWishlistChange(product._id, false);
      } else {
        await addToWishlist(product._id);
        setWishlisted(true);
        if (onWishlistChange) onWishlistChange(product._id, true);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setActionError(err.response?.data?.message || 'Wishlist action failed');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartLoading || isOutOfStock) return;

    setCartLoading(true);
    setActionError('');

    const res = await addToCart(product._id);
    if (res.success) {
      setAddedAnimation(true);
      setTimeout(() => setAddedAnimation(false), 1800);
    } else {
      if (res.message?.includes('Unauthorized') || res.message?.includes('session')) {
        navigate('/login');
        return;
      }
      setActionError(res.message);
    }
    setCartLoading(false);
  };

  return (
    <div className="product-card">
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

        {/* Wishlist heart button */}
        <button
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          className="wishlist-btn"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          title={wishlisted ? 'In Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            size={16}
            color={wishlisted ? '#ef4444' : '#94a3b8'}
            fill={wishlisted ? '#ef4444' : 'none'}
            strokeWidth={wishlisted ? 2.5 : 2}
          />
        </button>
      </div>

      <div className="product-body">
        <h3 className="product-title">{product.name}</h3>
        <p className="product-desc">{product.description}</p>

        {actionError && (
          <div style={{
            color: 'var(--danger)',
            fontSize: '0.72rem',
            marginBottom: '0.5rem',
            fontWeight: 600,
            padding: '0.3rem 0.5rem',
            background: 'var(--danger-light)',
            borderRadius: '6px',
          }}>
            {actionError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div className="product-price">₹{product.price.toLocaleString('en-IN')}</div>
          <div className={`product-stock ${isOutOfStock ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-in'}`}>
            {isOutOfStock ? '• Out of Stock' : isLowStock ? `• Only ${product.stock} left` : `• In Stock`}
          </div>
        </div>

        {/* Actions row */}
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
            onClick={handleAddToCart}
            disabled={isOutOfStock || cartLoading}
            className={`btn ${addedAnimation ? 'btn-success' : 'btn-primary'}`}
            style={{
              padding: '0.5rem',
              fontSize: '0.8rem',
              transition: 'all 0.3s ease',
            }}
          >
            {cartLoading ? (
              <span>Adding...</span>
            ) : addedAnimation ? (
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
}
