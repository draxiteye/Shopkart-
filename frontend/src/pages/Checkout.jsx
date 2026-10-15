import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, AlertCircle, ShoppingBag, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { createPaymentOrder, verifyPayment } from '../services/api';

// Helper to load Razorpay external script safely
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout({ customer }) {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearLocalCart } = useCart();

  const [formData, setFormData] = useState({
    fullName: customer?.fullName || '',
    phone: customer?.phone || '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Update customer defaults if customer changes
  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || customer.fullName || '',
        phone: prev.phone || customer.phone || '',
      }));
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setPaymentError('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (formData.phone.trim().replace(/\D/g, '').length < 10) {
      errors.phone = 'Please provide a valid 10-digit phone number';
    }

    if (!formData.addressLine1.trim()) errors.addressLine1 = 'Street address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';

    const cleanPincode = formData.pincode.trim();
    if (!cleanPincode) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(cleanPincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!validate()) return;
    if (cartItems.length === 0) {
      setPaymentError('Cannot checkout with an empty cart.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create order on backend (Server validates cart & stock, calculates total)
      const orderData = await createPaymentOrder({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      });

      const { orderId, razorpayOrderId, amountPaise, currency, keyId } = orderData;

      // 2. Load Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError('Failed to load Razorpay payment gateway. Please check your network connection.');
        setSubmitting(false);
        return;
      }

      // If keyId is missing from backend (no live test keys in env), handle local test verification gracefully
      if (!keyId || keyId.startsWith('rzp_test_your_key_id')) {
        console.warn('Razorpay Test Mode keys not configured in backend env. Running simulated test checkout verification.');
        // Verify payment directly with simulated payload
        try {
          await verifyPayment({
            shopKartOrderId: orderId,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: `pay_test_${orderId}`,
            razorpay_signature: `sim_sig_${orderId}`,
          });
          clearLocalCart();
          navigate(`/order-success/${orderId}`);
          return;
        } catch (verifyErr) {
          setPaymentError(verifyErr.response?.data?.message || 'Payment verification failed');
          setSubmitting(false);
          return;
        }
      }

      // 3. Configure Razorpay modal
      const options = {
        key: keyId,
        amount: amountPaise,
        currency: currency || 'INR',
        name: 'ShopKart',
        description: `Order #${orderId.slice(-6)} Payment`,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
        order_id: razorpayOrderId,
        prefill: {
          name: formData.fullName,
          email: customer?.email || '',
          contact: formData.phone,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async function (response) {
          // Backend verification on payment success callback
          try {
            await verifyPayment({
              shopKartOrderId: orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Payment verified: Clear cart and redirect
            clearLocalCart();
            navigate(`/order-success/${orderId}`);
          } catch (verifyErr) {
            setPaymentError(
              verifyErr.response?.data?.message || 'Payment verification failed on backend. Your cart remains intact.'
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            setPaymentError('Payment window was closed. Your cart remains saved.');
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (resp) {
        setPaymentError(resp.error?.description || 'Payment transaction failed. Cart is unchanged.');
        setSubmitting(false);
      });
      rzpInstance.open();
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Checkout initialization failed. Please check stock and try again.');
      setSubmitting(false);
    }
  };

  // If cart is empty, do not show normal checkout form
  if (cartItems.length === 0) {
    return (
      <div className="container page-enter" style={{ padding: '4rem 1.5rem' }}>
        <div className="state-box" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <ShoppingBag className="state-icon" style={{ color: 'var(--text-faint)' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You cannot proceed to checkout without any items in your shopping cart.
          </p>
          <Link to="/products" className="btn btn-primary">
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalUnits = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <Link to="/cart" className="btn btn-outline" style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.45rem 0.85rem' }}>
        <ArrowLeft size={16} />
        <span>Back to Cart</span>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Shipping Form Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="var(--primary)" />
            <span>Shipping & Delivery Details</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Please enter your complete address for fast, secure doorstep delivery.
          </p>

          {paymentError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Receiver's full name"
                className="form-input"
              />
              {formErrors.fullName && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.fullName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="form-input"
              />
              {formErrors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="House / Flat No., Street, Landmark"
                className="form-input"
              />
              {formErrors.addressLine1 && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.addressLine1}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Mumbai"
                  className="form-input"
                />
                {formErrors.city && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.city}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="form-input"
                />
                {formErrors.state && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.state}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pincode (6 digits)</label>
              <input
                type="text"
                name="pincode"
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 400001"
                className="form-input"
              />
              {formErrors.pincode && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>{formErrors.pincode}</span>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <CreditCard size={18} />
              <span>{submitting ? 'Connecting Payment...' : `Pay ₹${subtotal.toLocaleString('en-IN')} with Razorpay`}</span>
            </button>
          </form>
        </div>

        {/* Order Items Review Sidebar */}
        <div className="card" style={{ position: 'sticky', top: '5.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Review Order ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '0.25rem' }}>
            {cartItems.map((item) => (
              <div key={item.product._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.quantity} × ₹{item.product.price.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
            <span>Total Payable</span>
            <span className="text-gradient">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-light)' }}>
            <ShieldCheck size={16} color="var(--success)" />
            <span>Razorpay Active • Encrypted transaction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
