import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentCustomer } from '../services/api';

export default function ProtectedRoute({ children, customer, setCustomer }) {
  const [loading, setLoading] = useState(customer ? false : true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!customer);

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        const data = await getCurrentCustomer();
        if (isMounted) {
          if (setCustomer) setCustomer(data);
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (isMounted) {
          if (setCustomer) setCustomer(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="state-box" style={{ maxWidth: '400px', margin: '6rem auto' }}>
        <div className="spinner"></div>
        <h3>Verifying authentication...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Checking your secure session credentials with the server.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
