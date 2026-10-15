import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, loading, error, subtotal, updateQuantity, removeFromCart, fetchCart } = useCart();
  const [updatingId, setUpdatingId] = useState(null);

  const handleIncrement = async (productId, currentQty, stock) => {
    if (currentQty >= stock) return;
    setUpdatingId(productId);
    await updateQuantity(productId, currentQty + 1);
    setUpdatingId(null);
  };

  const handleDecrement = async (productId, currentQty) => {
    if (currentQty <= 1) return;
    setUpdatingId(productId);
    await updateQuantity(productId, currentQty - 1);
    setUpdatingId(null);
  };

  const handleRemove = async (productId) => {
    setUpdatingId(productId);
    await removeFromCart(productId);
    setUpdatingId(null);
  };

  const totalUnits = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <ShoppingCart size={26} color="var(--primary)" />
          <span>Shopping Cart</span>
          {cartItems.length > 0 && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--bg-main)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}>
              {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
            </span>
          )}
        </h1>
        <p className="page-subtitle">Review your selected items before proceeding to checkout.</p>
      </div>

      {loading && cartItems.length === 0 ? (
        <div className="state-box">
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading your cart...</p>
        </div>
      ) : error ? (
        <div className="state-box" style={{ borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Error loading cart</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <button onClick={fetchCart} className="btn btn-outline">Retry</button>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="state-box">
          <ShoppingCart className="state-icon" style={{ color: 'var(--text-faint)' }} />
          <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Your cart is empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Looks like you haven't added anything yet. Start shopping!
          </p>
          <Link to="/products" className="btn btn-primary">
            <ShoppingBag size={16} />
            <span>Browse Products</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cartItems.map((item) => {
              const product = item.product;
              if (!product) return null;
              const isBusy = updatingId === product._id;
              const lineTotal = (product.price || 0) * (item.quantity || 1);
              const isAtMaxStock = item.quantity >= product.stock;

              return (
                <div
                  key={product._id}
                  className="card"
                  style={{
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                    }}
                  />

                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <span className="badge badge-primary" style={{ marginBottom: '0.3rem' }}>
                      {product.category}
                    </span>
                    <Link to={`/products/${product._id}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0 0.3rem' }}>
                        {product.name}
                      </h3>
                    </Link>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      ₹{product.price.toLocaleString('en-IN')} per unit
                    </div>
                    {product.stock <= 5 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
                        Only {product.stock} left
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="qty-stepper">
                    <button
                      className="qty-btn"
                      onClick={() => handleDecrement(product._id, item.quantity)}
                      disabled={isBusy || item.quantity <= 1}
                      aria-label="Decrease quantity"
                      title={item.quantity <= 1 ? 'Use remove to delete' : 'Decrease'}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleIncrement(product._id, item.quantity, product.stock)}
                      disabled={isBusy || isAtMaxStock}
                      aria-label="Increase quantity"
                      title={isAtMaxStock ? 'Max stock reached' : 'Increase'}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div style={{ textAlign: 'right', minWidth: '85px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={isBusy}
                    title="Remove item"
                    className="btn btn-ghost"
                    style={{
                      padding: '0.4rem',
                      color: 'var(--text-faint)',
                      borderRadius: '8px',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Order Summary Sidebar */}
          <div className="card" style={{ position: 'sticky', top: '5.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Order Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <span>Items ({totalUnits} units)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <span>Shipping</span>
                <span className="badge badge-success">FREE</span>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                <span>Total</span>
                <span className="text-gradient">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <Sparkles size={16} />
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              marginTop: '1rem',
              color: 'var(--text-faint)',
              fontSize: '0.75rem',
            }}>
              <ShieldCheck size={14} color="var(--success)" />
              <span>256-bit encrypted checkout</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
