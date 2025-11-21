import { useState, useEffect } from 'react';
import api from '../utils/api';
import ProtectedRoute from '../components/ProtectedRoute';
import { formatPricePKR } from '../utils/currency';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    pendingVendors: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  // Data states
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview' || activeTab === 'analytics') {
        await Promise.all([
          fetchStats(),
          fetchAnalytics()
        ]);
      } else if (activeTab === 'vendors') {
        await fetchVendors();
      } else if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'products') {
        await fetchProducts();
      } else if (activeTab === 'orders') {
        await fetchOrders();
      } else if (activeTab === 'categories') {
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/orders/all')
      ]);

      const allUsers = usersRes.data.users || [];
      const vendors = allUsers.filter(u => u.role === 'vendor');
      const pendingVendors = vendors.filter(v => !v.vendorInfo?.isVerified);

      const totalRevenue = (ordersRes.data.orders || []).filter(order => order.status !== 'cancelled').reduce(
        (sum, order) => sum + (order.totalPrice || 0), 0
      );

      setStats({
        totalUsers: allUsers.length,
        totalVendors: vendors.length,
        pendingVendors: pendingVendors.length,
        totalProducts: (productsRes.data.products || []).length,
        totalOrders: (ordersRes.data.orders || []).length,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/orders/all'),
        api.get('/products')
      ]);

      const orders = ordersRes.data.orders || [];
      const products = productsRes.data.products || [];

      // Calculate analytics
      const ordersByStatus = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const revenueByMonth = orders.filter(order => order.status !== 'cancelled').reduce((acc, order) => {
        const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + (order.totalPrice || 0);
        return acc;
      }, {});

      setAnalytics({
        ordersByStatus,
        revenueByMonth,
        topProducts: products.slice(0, 5),
        recentOrders: orders.slice(0, 5)
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/users');
      const allUsers = res.data.users || [];
      setVendors(allUsers.filter(u => u.role === 'vendor'));
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/all');
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchCategories = async () => {
    // Mock categories - replace with actual API call
    setCategories([
      'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Beauty', 'Food'
    ]);
  };

  const handleApproveVendor = async (vendorId) => {
    try {
      await api.put(`/users/${vendorId}`, { 
        'vendorInfo.isVerified': true 
      });
      alert('Vendor approved successfully!');
      fetchVendors();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve vendor');
    }
  };

  const handleDenyVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to deny this vendor?')) return;
    
    try {
      await api.put(`/users/${vendorId}`, { 
        'vendorInfo.isVerified': false,
        isActive: false
      });
      alert('Vendor denied');
      fetchVendors();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to deny vendor');
    }
  };

  const handleToggleVendorStatus = async (vendorId, isActive) => {
    const action = isActive ? 'Deactivate' : 'Activate';
    if (!window.confirm(`Are you sure you want to ${action} this vendor?`)) return;

    try {
      await api.put(`/users/${vendorId}`, { isActive: !isActive });
      alert(`Vendor ${action}d successfully!`);
      fetchVendors();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to DELETE this vendor? This action is irreversible.')) return;

    try {
      await api.delete(`/users/${vendorId}`);
      alert('Vendor deleted successfully');
      fetchVendors();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    try {
      await api.put(`/users/${userId}`, { isActive: !isActive });
      fetchUsers();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleToggleProductStatus = async (productId, isActive) => {
    try {
      await api.put(`/products/${productId}`, { isActive: !isActive });
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/products/${productId}`);
      alert('Product deleted successfully');
      fetchProducts();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      alert('Order status updated');
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleAddCategory = async (categoryName) => {
    if (!categoryName.trim()) return;
    // Mock implementation - replace with actual API call
    setCategories([...categories, categoryName.trim()]);
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) return;
    // Mock implementation - replace with actual API call
    setCategories(categories.filter(c => c !== categoryName));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'vendors', label: 'Vendors', icon: '🏪', badge: stats.pendingVendors },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your Business</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-x-auto">
            <div className="flex space-x-1 p-2 border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab stats={stats} />}
                {activeTab === 'vendors' && (
                  <VendorsTab
                    vendors={vendors}
                    onApprove={handleApproveVendor}
                    onDeny={handleDenyVendor}
                    onToggleStatus={handleToggleVendorStatus}
                    onDelete={handleDeleteVendor}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                )}
                {activeTab === 'users' && (
                  <UsersTab
                    users={users}
                    onToggleStatus={handleToggleUserStatus}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                )}
                {activeTab === 'products' && (
                  <ProductsTab
                    products={products}
                    onToggleStatus={handleToggleProductStatus}
                    onDelete={handleDeleteProduct}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                )}
                {activeTab === 'orders' && (
                  <OrdersTab
                    orders={orders}
                    onUpdateStatus={handleUpdateOrderStatus}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                )}
                {activeTab === 'categories' && (
                  <CategoriesTab
                    categories={categories}
                    onAdd={handleAddCategory}
                    onDelete={handleDeleteCategory}
                  />
                )}
                {activeTab === 'reports' && <ReportsTab orders={orders} products={products} users={users} />}
                {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} stats={stats} />}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon="👥"
        color="blue"
        change=""
      />
      <StatCard
        title="Total Vendors"
        value={stats.totalVendors}
        icon="🏪"
        color="green"
        badge={stats.pendingVendors > 0 ? `${stats.pendingVendors} pending` : null}
      />
      <StatCard
        title="Total Products"
        value={stats.totalProducts}
        icon="📦"
        color="purple"
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders}
        icon="🛒"
        color="orange"
      />
      <StatCard
        title="Total Revenue"
        value={formatPricePKR(stats.totalRevenue)}
        icon="💰"
        color="green"
      />
    </div>
  </div>
);

const StatCard = ({ title, value, icon, color, change, badge }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && <p className="text-sm text-green-600 mt-1">{change}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      {badge && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-orange-600 font-medium">{badge}</span>
        </div>
      )}
    </div>
  );
};

// Vendors Tab Component
const VendorsTab = ({ vendors, onApprove, onDeny, onToggleStatus, onDelete, searchTerm, onSearchChange }) => {
  const filteredVendors = vendors.filter(v =>
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vendorInfo?.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingVendors = filteredVendors.filter(v => !v.vendorInfo?.isVerified);
  const approvedVendors = filteredVendors.filter(v => v.vendorInfo?.isVerified);

  return (
    <div>
      {/* Search bar remains the same */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vendor Management</h2>
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Pending Vendors Section */}
      {pendingVendors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-orange-600">
            Pending Approval ({pendingVendors.length})
          </h3>
          <div className="space-y-4">
            {pendingVendors.map((vendor) => (
              <VendorCard
                key={vendor._id}
                vendor={vendor}
                onApprove={() => onApprove(vendor._id)}
                onDeny={() => onDeny(vendor._id)}
                isPending={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved Vendors Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Vendors ({approvedVendors.length})</h3>
        {approvedVendors.length > 0 ? (
          <div className="space-y-4">
            {approvedVendors.map((vendor) => (
              <VendorCard
                key={vendor._id}
                vendor={vendor}
                onToggleStatus={() => onToggleStatus(vendor._id, vendor.isActive)}
                onDelete={() => onDelete(vendor._id)}
                isPending={false}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No approved vendors found</p>
        )}
      </div>
    </div>
  );
};

const VendorCard = ({ vendor, onApprove, onDeny, isPending, onToggleStatus, onDelete }) => (
  <div className={`border rounded-lg p-4 ${isPending ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
    <div className="flex justify-between items-start">
      {/* Vendor info display remains the same */}
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {vendor.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-lg">{vendor.name}</h4>
            <p className="text-sm text-gray-600">{vendor.email}</p>
            {vendor.vendorInfo?.businessName && (
              <p className="text-sm text-gray-700 mt-1">
                <strong>Business:</strong> {vendor.vendorInfo.businessName}
              </p>
            )}
          </div>
        </div>
        {vendor.vendorInfo?.businessDescription && (
          <p className="text-sm text-gray-600 mt-3">{vendor.vendorInfo.businessDescription}</p>
        )}
        <div className="flex items-center space-x-4 mt-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            vendor.vendorInfo?.isVerified
              ? 'bg-green-100 text-green-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            {vendor.vendorInfo?.isVerified ? 'Verified' : 'Pending Verification'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {vendor.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col space-y-2 ml-4">
        {isPending ? (
          <>
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full text-sm"
            >
              Approve
            </button>
            <button
              onClick={onDeny}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full text-sm"
            >
              Deny
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onToggleStatus}
              className={`px-4 py-2 rounded-lg text-white transition-colors w-full text-sm ${
                vendor.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`
              }
            >
              {vendor.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full text-sm"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);

// Users Tab Component
const UsersTab = ({ users, onToggleStatus, searchTerm, onSearchChange }) => {
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onToggleStatus(user._id, user.isActive)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      user.isActive
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Products Tab Component
const ProductsTab = ({ products, onToggleStatus, onDelete, searchTerm, onSearchChange }) => {
  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProducts.map((product) => (
          <div key={product._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <img
                src={product.images?.[0] || 'https://via.placeholder.com/100'}
                alt={product.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{product.name}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-blue-600 font-bold">{formatPricePKR(product.price)}</span>
                  <span className="text-sm text-gray-600">Stock: {product.stock}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {product.category}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onToggleStatus(product._id, product.isActive)}
                  className={`px-3 py-1 rounded text-sm ${
                    product.isActive
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {product.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => onDelete(product._id)}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Orders Tab Component
const OrdersTab = ({ orders, onUpdateStatus, searchTerm, onSearchChange }) => {
  const filteredOrders = orders.filter(o =>
    o._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <input
          type="text"
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                {/* Make order id clickable to go to order details */}
                <Link to={`/orders/${order._id}`} className="font-semibold text-blue-600 hover:underline">
                  Order #{order._id.slice(-8)}
                </Link>
                <p className="text-sm text-gray-600">
                  {order.user?.name} - {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">Total: {formatPricePKR(order.totalPrice)}</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order._id, e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Items:</p>
              <div className="space-y-1">
                {order.orderItems?.map((item, idx) => (
                  <div key={idx} className="text-sm text-gray-600">
                    {item.name} x {item.quantity} - {formatPricePKR(item.price)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Categories Tab Component
const CategoriesTab = ({ categories, onAdd, onDelete }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(newCategory);
    setNewCategory('');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Category Management</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 flex space-x-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Add new category..."
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Category
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <div
            key={category}
            className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow"
          >
            <span className="font-medium">{category}</span>
            <button
              onClick={() => onDelete(category)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reports Tab Component
const ReportsTab = ({ orders, products, users }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Reports</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Sales Report</h3>
        <p className="text-gray-600">Total Orders: {orders.length}</p>
        <p className="text-gray-600">Total Revenue: {formatPricePKR(
          orders.filter(order => order.status !== 'cancelled').reduce((sum, o) => sum + (o.totalPrice || 0), 0)
        )}</p>
      </div>
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Product Report</h3>
        <p className="text-gray-600">Total Products: {products.length}</p>
        <p className="text-gray-600">Active Products: {products.filter(p => p.isActive).length}</p>
      </div>
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">User Report</h3>
        <p className="text-gray-600">Total Users: {users.length}</p>
        <p className="text-gray-600">Active Users: {users.filter(u => u.isActive).length}</p>
      </div>
    </div>
  </div>
);

// Analytics Tab Component
const AnalyticsTab = ({ analytics, stats }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Analytics & Insights</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Orders by Status</h3>
        {analytics.ordersByStatus && Object.entries(analytics.ordersByStatus).map(([status, count]) => (
          <div key={status} className="flex justify-between items-center mb-2">
            <span className="capitalize">{status}</span>
            <span className="font-semibold">{count}</span>
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Revenue Overview</h3>
        <p className="text-2xl font-bold text-green-600">{formatPricePKR(
          orders.filter(order => order.status !== 'cancelled').reduce((sum, o) => sum + (o.totalPrice || 0), 0)
        )}</p>
        <p className="text-sm text-gray-600 mt-2">Total Revenue</p>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
