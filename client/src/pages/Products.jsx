import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    page: parseInt(searchParams.get('page')) || 1
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      params.append('page', filters.page);
      params.append('limit', '12');

      const res = await api.get(`/products?${params}`);
      setProducts(res.data.products);
      setPagination({
        totalPages: res.data.totalPages,
        currentPage: res.data.currentPage,
        total: res.data.total
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.get('/categories?isActive=true');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
    setSearchParams({ ...filters, [key]: value, page: 1 });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="font-semibold mb-4">Filters</h2>
            
            <div className="mb-4">
              <label htmlFor="search-products" className="block text-sm font-medium mb-2">Search</label>
              <input
                id="search-products"
                name="search"
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search products..."
                className="w-full px-3 py-2 border rounded-md"
                aria-label="Search products"
              />
            </div>

            <div>
              {loadingCategories ? (
                <div>
                  <div className="block text-sm font-medium mb-2">Category</div>
                  <div className="w-full px-3 py-2 border rounded bg-gray-100 animate-pulse">
                    Loading categories...
                  </div>
                </div>
              ) : (
                <>
                  <label htmlFor="category-filter" className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    id="category-filter"
                    name="category"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    aria-label="Filter by category"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="text-center py-12">Loading products...</div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8 space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', filters.page - 1)}
                    disabled={filters.page === 1}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">
                    Page {filters.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handleFilterChange('page', filters.page + 1)}
                    disabled={filters.page >= pagination.totalPages}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No products found</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;

