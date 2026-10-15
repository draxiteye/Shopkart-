import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, AlertCircle, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { registerCustomer } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Frontend validation
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password || !formData.phone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const result = await registerCustomer(formData);
      setSuccess(result.message || 'Account created! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your details and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe', icon: User, required: true },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', icon: Mail, required: true },
    { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters', icon: Lock, required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '9876543210', icon: Phone, required: true },
  ];

  return (
    <div className="auth-wrapper">
      <div className="card auth-card page-enter">
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
          }}>
            <ShoppingBag size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
            ShopKart
          </span>
        </div>

        <h2 className="card-title">Create your account</h2>
        <p className="card-subtitle">Join ShopKart and start exploring the best products</p>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div className="form-group" key={field.name}>
              <label className="form-label">{field.label}</label>
              <div style={{ position: 'relative' }}>
                <field.icon
                  size={16}
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}
                />
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  required={field.required}
                />
              </div>
            </div>
          ))}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
