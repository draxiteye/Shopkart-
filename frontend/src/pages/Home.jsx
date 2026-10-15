import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, ShieldCheck, ShoppingBag, ArrowRight, Package, Heart, ShoppingCart, Sparkles } from 'lucide-react';
import { getCurrentCustomer } from '../services/api';

export default function Home({ customer, setCustomer }) {
  const [profile, setProfile] = useState(customer);
  const [loading, setLoading] = useState(!customer);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getCurrentCustomer();
        setProfile(data);
        if (setCustomer) setCustomer(data);
      } catch (err) {
        setError('Failed to load customer profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="spinner"></div>
          <h3>Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  const quickActions = [
    { to: '/products', icon: ShoppingBag, label: 'Browse Products', desc: 'Explore our full catalogue', color: '#6366f1' },
    { to: '/wishlist', icon: Heart, label: 'My Wishlist', desc: 'Saved items you love', color: '#ef4444' },
    { to: '/cart', icon: ShoppingCart, label: 'Shopping Cart', desc: 'Review & checkout', color: '#06b6d4' },
    { to: '/orders', icon: Package, label: 'Order History', desc: 'Track past purchases', color: '#10b981' },
  ];

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3rem' }}>
      {/* Hero Banner */}
      <div className="hero-gradient" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255,255,255,0.18)',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '1rem',
            backdropFilter: 'blur(4px)',
          }}>
            <ShieldCheck size={14} />
            <span>Secure Session Active</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            marginBottom: '0.65rem',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}>
            Welcome back, {profile?.fullName?.split(' ')[0] || 'Customer'}! 👋
          </h1>

          <p style={{ fontSize: '1rem', opacity: 0.88, maxWidth: '520px', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Your ShopKart dashboard is ready. Browse electronics, fashion, books, and home essentials — all in one place.
          </p>

          <Link
            to="/products"
            className="btn"
            style={{
              background: 'white',
              color: '#6366f1',
              fontWeight: 700,
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          >
            <Sparkles size={17} />
            <span>Explore Products</span>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '12px',
              background: `${action.color}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <action.icon size={20} color={action.color} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                {action.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {action.desc}
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-faint)" style={{ marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>

      {/* Profile Card */}
      <div className="card" style={{ maxWidth: '720px' }}>
        <h2 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-main)',
        }}>
          <User size={18} color="var(--primary)" />
          <span>Account Details</span>
        </h2>

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: User, label: 'Full Name', value: profile?.fullName },
            { icon: Mail, label: 'Email', value: profile?.email },
            { icon: Phone, label: 'Phone', value: profile?.phone },
          ].map((field) => (
            <div
              key={field.label}
              style={{
                padding: '1rem',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.3rem',
              }}>
                <field.icon size={13} />
                <span>{field.label}</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {field.value || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
