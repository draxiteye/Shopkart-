import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import { getCurrentCustomer } from './services/api';
import { CartProvider } from './context/CartContext';
import { ShoppingBag } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <ShoppingBag size={14} color="var(--primary)" />
        <span className="footer-brand">ShopKart</span>
      </div>
      <div>Built with Go Fiber · React · MongoDB — © {new Date().getFullYear()}</div>
    </footer>
  );
}

export default function App() {
  const [customer, setCustomer] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check initial authentication state once on mount via HttpOnly cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getCurrentCustomer();
        setCustomer(data);
      } catch (err) {
        setCustomer(null);
      } finally {
        setInitialCheckDone(true);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (profile) => {
    setCustomer(profile);
  };

  const handleLogout = () => {
    setCustomer(null);
  };

  if (!initialCheckDone) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%)',
      }}>
        <div className="state-box" style={{ maxWidth: '400px', border: 'none', background: 'transparent' }}>
          <div style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary), #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
          }}>
            <ShoppingBag size={24} color="white" />
          </div>
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Initializing ShopKart...
          </p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider customer={customer}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar customer={customer} onLogout={handleLogout} />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route
                path="/"
                element={customer ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/register"
                element={customer ? <Navigate to="/home" replace /> : <Register />}
              />

              <Route
                path="/login"
                element={customer ? <Navigate to="/home" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
              />

              {/* Protected Route for /home */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <Home customer={customer} setCustomer={setCustomer} />
                  </ProtectedRoute>
                }
              />

              {/* Public Product Catalogue & Details */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />

              {/* Protected Wishlist Route */}
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />

              {/* Protected Shopping Cart Route */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <Cart />
                  </ProtectedRoute>
                }
              />

              {/* Protected Checkout Route */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <Checkout customer={customer} />
                  </ProtectedRoute>
                }
              />

              {/* Protected Order Confirmation Route */}
              <Route
                path="/order-success/:orderId"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <OrderSuccess />
                  </ProtectedRoute>
                }
              />

              {/* Protected Orders List Route */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <Orders />
                  </ProtectedRoute>
                }
              />

              {/* Protected Single Order Details Route */}
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute customer={customer} setCustomer={setCustomer}>
                    <OrderDetails />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </CartProvider>
  );
}
