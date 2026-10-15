import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Home, LogOut, LogIn, UserPlus, Package, Heart, ShoppingCart, Menu, X, User } from 'lucide-react';
import { logoutCustomer } from '../services/api';
import { useCart } from '../context/CartContext';

export default function Navbar({ customer, onLogout }) {
  const navigate = useNavigate();
  const { cartCount, clearLocalCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearLocalCart();
      if (onLogout) onLogout();
      navigate('/login');
    }
  };

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link to={customer ? "/home" : "/"} className="nav-brand" onClick={closeMenu}>
          <div className="nav-brand-icon">
            <ShoppingBag size={18} />
          </div>
          <span>ShopKart</span>
        </Link>

        {/* Mobile toggle */}
        <button
          className="nav-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          {customer ? (
            <>
              <NavLink
                to="/home"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Home size={17} />
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/products"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Package size={17} />
                <span>Products</span>
              </NavLink>

              <NavLink
                to="/wishlist"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Heart size={17} />
                <span>Wishlist</span>
              </NavLink>

              <NavLink
                to="/cart"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ShoppingCart size={17} />
                  {cartCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-7px',
                        right: '-9px',
                        background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)',
                        animation: 'scaleIn 0.3s ease',
                      }}
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
              </NavLink>

              <NavLink
                to="/orders"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Package size={17} />
                <span>Orders</span>
              </NavLink>

              {/* User greeting + Logout */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginLeft: '0.25rem',
                paddingLeft: '0.5rem',
                borderLeft: '1px solid var(--border)',
              }}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-light), #ddd6fe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={14} color="var(--primary)" />
                </div>
                <button
                  onClick={() => { handleLogout(); closeMenu(); }}
                  className="btn btn-ghost"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                  title={`Logout ${customer.fullName || ''}`}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/products"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Package size={17} />
                <span>Products</span>
              </NavLink>

              <NavLink
                to="/login"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <LogIn size={17} />
                <span>Sign In</span>
              </NavLink>

              <NavLink
                to="/register"
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                onClick={closeMenu}
              >
                <UserPlus size={15} />
                <span>Get Started</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
