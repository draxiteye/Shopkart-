import React, { useEffect, useState } from 'react';
import { Package, AlertCircle, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { getProducts, getWishlist } from '../services/api';

const CATEGORIES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSort, setSelectedSort] = useState('');

  const fetchWishlist = async () => {
    try {
      const data = await getWishlist();
      if (data.wishlist) {
        setWishlistIds(new Set(data.wishlist.map((item) => item._id)));
      }
    } catch {
      // Ignored if user not authenticated
    }
  };

  const fetchProductList = async (search = searchTerm, category = selectedCategory, sort = selectedSort) => {
    setLoading(true);
    setError('');
    try {
      const data = await getProducts({ search, category, sort });
      setProducts(data.products || []);
    } catch (err) {
      setError('Something went wrong while loading products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and filter updates
  useEffect(() => {
    fetchWishlist();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductList(searchTerm, selectedCategory, selectedSort);
    }, 250); // Debounce search input

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedSort]);

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
  };

  const handleWishlistChange = (productId, isAdded) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isAdded) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  return (
    <div className="container page-enter" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">
            <Sparkles size={24} color="var(--primary)" />
            <span>Product Catalogue</span>
          </h1>
          <p className="page-subtitle">
            Explore premium gadgets, trendy fashion, curated books, and modern home essentials.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearchSubmit={() => fetchProductList(searchTerm, selectedCategory, selectedSort)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sort by:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="form-input"
              style={{ padding: '0.55rem 0.9rem', width: 'auto', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <option value="">Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering based on state */}
      {loading ? (
        <div className="state-box">
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading products catalogue...</p>
        </div>
      ) : error ? (
        <div className="state-box" style={{ borderColor: '#fecaca' }}>
          <AlertCircle className="state-icon" style={{ color: 'var(--danger)' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem', fontWeight: 700 }}>Error Loading Products</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <button onClick={() => fetchProductList()} className="btn btn-outline">
            Try Again
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="state-box">
          <Package className="state-icon" style={{ color: '#cbd5e1' }} />
          <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>No products found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            We couldn't find any products matching your criteria. Try adjusting your search query or category filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All Categories');
            }}
            className="btn btn-primary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
            Showing {products.length} {products.length === 1 ? 'product' : 'products'}
          </div>
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                inWishlist={wishlistIds.has(product._id)}
                onWishlistChange={handleWishlistChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
