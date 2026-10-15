import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight, ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';
import { getOrderById } from '../services/api';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data.order);
      } catch (err) {
        console.error('Failed to load confirmed order details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return (
    <div className="container page-enter" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '540px', textAlign: 'center', padding: '3rem 2.25rem', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
          animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <CheckCircle2 size={40} color="#16a34a" />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          Payment & Order Confirmed!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          Thank you for choosing ShopKart! Your payment has been verified and your package is being prepared for fast delivery.
        </p>

        {loading ? (
          <div className="spinner" style={{ margin: '1.5rem auto' }}></div>
        ) : order ? (
          <div style={{
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem',
            textAlign: 'left',
            marginBottom: '2rem',
            border: '1px solid var(--border-light)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Order ID</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{order._id}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Payment Status</span>
              <span className="badge badge-success">{order.paymentStatus}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Delivery Status</span>
              <span className="badge badge-primary">{order.status}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <span>Total Paid</span>
              <span className="text-gradient">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Order Reference: {orderId}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <Link to="/orders" className="btn btn-outline" style={{ padding: '0.75rem', fontSize: '0.88rem' }}>
            <Package size={16} />
            <span>View Orders</span>
          </Link>

          <Link to="/products" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '0.88rem' }}>
            <span>Continue Shopping</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
