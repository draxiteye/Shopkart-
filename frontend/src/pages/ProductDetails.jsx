import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Shield, Truck, RefreshCw, AlertCircle, Heart, Sparkles } from 'lucide-react';
import { getProductById, addToWishlist, removeFromWishlist, getWishlist } from '../services/api';
import { useCart } from '../context/CartContext';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartLoading, setCartLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getProductById(id);
        setProduct(data.product);

        // Check wishlist status if user is logged in
        try {
          const wData = await getWishlist();
          if (wData.wishlist?.some((w) => w._id === id)) {
            setWishlisted(true);
          }
        } catch {
          // Unauthenticated or wishlist check failed silently
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to find or load product details.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleAddToCart = async () => {
    if (cartLoading || !product || product.stock <= 0) return;
    setCartLoading(true);
    setActionError('');

    const res = await addToCart(product._id);
    if (res.success) {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } else {
      if (res.message?.includes('Unauthorized') || res.message?.includes('session')) {
        navigate('/login');
        return;
      }
      setActionError(res.message);
    }
    setCartLoading(false);
  };

  const handleWishlistToggle = async () => {
    if (wishlistLoading || !product) return;
    setWishlistLoading(true);
    setActionError('');

    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        setWishlisted(false);
      } else {
        await addToWishlist(product._id);
        setWishlisted(true);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setActionError(err.response?.data?.message || 'Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '480px', margin: '0 auto', borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem', fontWeight: 700 }}>Product Unavailable</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This product does not exist.'}</p>
          <Link to="/products" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      {/* Back button */}
      <Link
        to="/products"
        className="btn btn-outline"
        style={{ marginBottom: '1.75rem', padding: '0.5rem 0.9rem', display: 'inline-flex' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Products</span>
      </Link>

      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          padding: '2.25rem',
          alignItems: 'center',
        }}
      >
        {/* Product Image */}
        <div style={{
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: '1px solid var(--border)',
          maxHeight: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={product.image}
            alt={product.name}
            style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
            }}
          />
        </div>

        {/* Product Details */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span className="badge badge-primary">
              {product.category}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isOutOfStock ? 'var(--danger)' : 'var(--success)',
              }}
            >
              {isOutOfStock ? '• Out of Stock' : `• In Stock (${product.stock} available)`}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.15rem)', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            {product.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
            {product.description}
          </p>

          {actionError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '2rem' }}>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || cartLoading}
              className={`btn ${addedToCart ? 'btn-success' : 'btn-primary'}`}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}
            >
              {cartLoading ? (
                <span>Adding to Cart...</span>
              ) : addedToCart ? (
                <>
                  <Check size={18} />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleWishlistToggle}
              disabled={wishlistLoading}
              className="btn btn-outline"
              style={{
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                borderColor: wishlisted ? '#fecaca' : 'var(--border)',
                color: wishlisted ? '#dc2626' : 'var(--text-main)',
                background: wishlisted ? '#fef2f2' : 'transparent',
              }}
            >
              <Heart size={18} fill={wishlisted ? '#ef4444' : 'none'} color={wishlisted ? '#ef4444' : 'currentColor'} />
              <span>{wishlistLoading ? 'Saving...' : wishlisted ? 'In Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

          {/* Assurance perks */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '1rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>
              <Truck size={17} color="var(--primary)" />
              <span>Fast Doorstep Delivery</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>
              <Shield size={17} color="var(--primary)" />
              <span>1 Year Warranty</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>
              <RefreshCw size={17} color="var(--primary)" />
              <span>7-Day Replacement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
