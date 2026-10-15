import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart, addToCart as apiAddToCart, updateCartQuantity as apiUpdateCartQuantity, removeFromCart as apiRemoveFromCart } from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children, customer }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart from backend whenever authenticated customer is present
  const fetchCart = useCallback(async () => {
    if (!customer) {
      setCartItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCart();
      setCartItems(data.cart || []);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err.response?.data?.message || 'Failed to load shopping cart');
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item or increment quantity
  const addToCart = async (productId) => {
    setError(null);
    try {
      const data = await apiAddToCart(productId);
      setCartItems(data.cart || []);
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add item to cart';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Update quantity of an item
  const updateQuantity = async (productId, quantity) => {
    setError(null);
    try {
      const data = await apiUpdateCartQuantity(productId, quantity);
      setCartItems(data.cart || []);
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update item quantity';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    setError(null);
    try {
      const data = await apiRemoveFromCart(productId);
      setCartItems(data.cart || []);
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove item from cart';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Clear local cart state (used after confirmed checkout or logout)
  const clearLocalCart = () => {
    setCartItems([]);
    setError(null);
  };

  // Derived values: Total count of items and subtotal amount
  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.product?.price || 0;
    return acc + price * (item.quantity || 0);
  }, 0);

  const value = {
    cartItems,
    cartCount,
    subtotal,
    loading,
    error,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearLocalCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
