import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ArrowLeft, MapPin, CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getOrderById } from '../services/api';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOrderById(id);
        setOrder(data.order);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '480px', margin: '0 auto', borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem', fontWeight: 700 }}>Order Not Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This order does not exist or you do not have permission to view it.'}</p>
          <Link to="/orders" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Back to Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <Link to="/orders" className="btn btn-outline" style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.45rem 0.85rem' }}>
        <ArrowLeft size={16} />
        <span>Back to Orders</span>
      </Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>
            <span>Order Details</span>
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Reference: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>{order._id}</span> • Placed on {dateStr}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
            Payment: {order.paymentStatus}
          </span>

          <span className="badge badge-primary">
            Status: {order.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.75rem', alignItems: 'flex-start' }}>
        {/* Left Column: Items */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={18} color="var(--primary)" />
            <span>Purchased Items ({order.items?.length || 0})</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: idx < order.items.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                  alt={item.name}
                  style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    {item.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Quantity: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.15rem' }}>
                    Locked historical purchase price
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
            <span>Order Total</span>
            <span className="text-gradient">₹{order.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Right Column: Shipping & Payment Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Shipping Address */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} color="var(--primary)" />
              <span>Shipping Address</span>
            </h2>

            <div style={{ color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700 }}>{order.shippingAddress?.fullName}</div>
              <div>{order.shippingAddress?.addressLine1}</div>
              <div>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
              </div>
              <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Phone: {order.shippingAddress?.phone}
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} color="var(--primary)" />
              <span>Payment Information</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gateway:</span>
                <span style={{ fontWeight: 600 }}>Razorpay (Test Mode)</span>
              </div>

              {order.razorpayOrderId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.razorpayOrderId}</span>
                </div>
              )}

              {order.razorpayPaymentId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.razorpayPaymentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
