import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle2, ChevronRight, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { getOrders } from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrderHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Package size={26} color="var(--primary)" />
          <span>My Orders</span>
          {orders.length > 0 && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--bg-main)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          )}
        </h1>
        <p className="page-subtitle">
          Track, review, and view detailed invoices of your previous ShopKart purchases.
        </p>
      </div>

      {loading ? (
        <div className="state-box">
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading your order history...</p>
        </div>
      ) : error ? (
        <div className="state-box" style={{ borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem', fontWeight: 700 }}>Error loading orders</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <button onClick={fetchOrderHistory} className="btn btn-outline">
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="state-box">
          <Package className="state-icon" style={{ color: 'var(--text-faint)' }} />
          <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>No orders placed yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            When you complete a purchase, your order history and receipt will appear here.
          </p>
          <Link to="/products" className="btn btn-primary">
            <ShoppingBag size={16} />
            <span>Start Shopping</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={order._id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ORDER PLACED</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{dateStr}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL AMOUNT</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>PAYMENT</div>
                    <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>STATUS</div>
                    <span className="badge badge-primary">
                      {order.status}
                    </span>
                  </div>

                  <Link to={`/orders/${order._id}`} className="btn btn-outline" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
                    <span>View Details</span>
                    <ChevronRight size={15} />
                  </Link>
                </div>

                {/* Ordered Items Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')} (Snapshot Price)
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
