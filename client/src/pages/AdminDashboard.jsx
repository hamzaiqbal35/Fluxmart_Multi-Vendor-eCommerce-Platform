import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../utils/api';
import ProtectedRoute from '../components/ProtectedRoute';
import { formatPricePKR } from '../utils/currency';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, ScatterChart, Scatter, RadarChart, Radar,
  Treemap, Brush, ReferenceLine, ReferenceDot, ReferenceArea
} from 'recharts';

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
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (error) {
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/users');
      const allUsers = res.data.users || [];
      setVendors(allUsers.filter(u => u.role === 'vendor'));
    } catch (error) {
    }
  };

  const fetchProducts = async () => {
    try {
      // Use admin endpoint to get ALL products (active and inactive)
      const res = await api.get('/products/admin/all');
      setProducts(res.data.products || []);
    } catch (error) {
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/all');
      setOrders(res.data.orders || []);
    } catch (error) {
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
      toast.success('Vendor approved successfully!');
      fetchVendors();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve vendor');
    }
  };

  const handleDenyVendor = async (vendorId) => {
    if (window.confirm('Are you sure you want to deny this vendor?')) {
      const confirmResult = window.confirm('This will deactivate the vendor. Are you sure?');
      if (!confirmResult) return;

      try {
        await api.put(`/users/${vendorId}`, {
          'vendorInfo.isVerified': false,
          isActive: false
        });
        toast.success('Vendor denied successfully');
        fetchVendors();
        fetchStats();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to deny vendor');
      }
    }
  };

  const handleToggleVendorStatus = async (vendorId, isActive) => {
    const action = isActive ? 'Deactivate' : 'Activate';
    const confirmResult = window.confirm(`Are you sure you want to ${action.toLowerCase()} this vendor?`);
    if (!confirmResult) return;

    try {
      await api.put(`/users/${vendorId}`, { isActive: !isActive });
      toast.success(`Vendor ${action.toLowerCase()}d successfully!`);
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    const confirmResult = window.confirm('Are you sure you want to DELETE this vendor? This action is irreversible and cannot be undone.');
    if (!confirmResult) return;

    try {
      await api.delete(`/users/${vendorId}`);
      toast.success('Vendor deleted successfully');
      fetchVendors();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    const action = isActive ? 'deactivate' : 'activate';
    const confirmResult = window.confirm(`Are you sure you want to ${action} this user?`);
    if (!confirmResult) return;

    try {
      await api.put(`/users/${userId}`, { isActive: !isActive });
      toast.success(`User ${action}d successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmResult = window.confirm('Are you sure you want to delete this user? This action is permanent and cannot be undone.');
    if (!confirmResult) return;

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleProductStatus = async (productId, currentStatus) => {
    try {
      await api.put(`/products/${productId}`, { isActive: !currentStatus });
      toast.success(`Product has been ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error(error.response?.data?.message || 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async (productId) => {
    const confirmResult = window.confirm('Are you sure you want to delete this product? This action is permanent and cannot be undone.');
    if (!confirmResult) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleTogglePayment = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/pay`);
      toast.success('Payment status updated successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment status');
    }
  };

  const handleAddCategory = async (categoryName) => {
    if (!categoryName.trim()) {
      toast.warning('Please enter a category name');
      return;
    }
    setCategories([...categories, categoryName.trim()]);
    toast.success('Category added successfully');
  };

  const handleDeleteCategory = async (categoryName) => {
    const confirmResult = window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`);
    if (!confirmResult) return;

    setCategories(categories.filter(c => c !== categoryName));
    toast.success(`Category "${categoryName}" deleted`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'vendors', label: 'Vendors', icon: '🏪', badge: stats.pendingVendors },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'reports', label: 'Reports', icon: '📄' }
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
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden border border-gray-100">
            <div className="flex p-1.5 bg-gray-50/50">
              <div className="flex space-x-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 flex-shrink-0
                      ${activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:bg-white hover:text-blue-500 hover:shadow-sm'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1
                    `}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                      {tab.badge > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {tab.badge}
                        </span>
                      )}
                    </span>
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full mx-2"></span>
                    )}
                  </button>
                ))}
              </div>
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
                    onDelete={handleDeleteUser}
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
                    onTogglePayment={handleTogglePayment}
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
        <div className="relative">
          <label htmlFor="vendor-search" className="sr-only">Search vendors</label>
          <input
            id="vendor-search"
            name="vendorSearch"
            type="search"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search vendors"
          />
        </div>
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
            {vendor.avatar ? (
              <img
                src={vendor.avatar}
                alt={vendor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              vendor.name?.charAt(0).toUpperCase()
            )}
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
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${vendor.vendorInfo?.isVerified
            ? 'bg-green-100 text-green-800'
            : 'bg-orange-100 text-orange-800'
            }`}>
            {vendor.vendorInfo?.isVerified ? 'Verified' : 'Pending Verification'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
              className={`px-4 py-2 rounded-lg text-white transition-colors w-full text-sm ${vendor.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`
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
const UsersTab = ({ users, onToggleStatus, onDelete, searchTerm, onSearchChange }) => {
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="relative">
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <input
            id="user-search"
            name="userSearch"
            type="search"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search users"
          />
        </div>
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
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3 overflow-hidden">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                            e.target.parentNode.textContent = user.name?.charAt(0).toUpperCase() || 'U';
                          }}
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || 'U'
                      )}
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => onToggleStatus(user._id, user.isActive)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${user.isActive
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => onDelete(user._id)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
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
        <div className="relative">
          <label htmlFor="product-search" className="sr-only">Search products</label>
          <input
            id="product-search"
            name="productSearch"
            type="search"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search products"
          />
        </div>
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
                  <span className={`px-2 py-1 rounded text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onToggleStatus(product._id, product.isActive)}
                  className={`px-3 py-1 rounded text-sm ${product.isActive
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
const OrdersTab = ({ orders, onUpdateStatus, searchTerm, onSearchChange, onTogglePayment }) => {
  const filteredOrders = orders.filter(o =>
    o._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <div className="relative">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input
            id="order-search"
            name="orderSearch"
            type="search"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search orders"
          />
        </div>
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

                {/* Vendor Cancellation Request Alert */}
                {order.vendorCancelRequested && order.status !== 'cancelled' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-start">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-red-800">Cancellation Requested by Vendor</p>
                        <p className="text-sm text-red-700 mt-1">Reason: {order.vendorCancelReason}</p>
                        <button
                          onClick={() => {
                            if (window.confirm('Approve cancellation for this order?')) {
                              onUpdateStatus(order._id, 'cancelled');
                            }
                          }}
                          className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Approve Cancellation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Info Display */}
                {order.status === 'shipped' && order.trackingNumber && (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    <p><span className="font-semibold">Courier:</span> {order.courier}</p>
                    <p><span className="font-semibold">Tracking:</span> {order.trackingNumber}</p>
                    <p><span className="font-semibold">Est. Delivery:</span> {new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-3">
                  <select
                    value={order.status}
                    onChange={(e) => onUpdateStatus(order._id, e.target.value)}
                    className="px-3 py-1 border rounded-lg text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {order.status}
                  </span>
                </div>

                {/* Admin Payment Toggle */}
                {order.status === 'delivered' && (
                  <button
                    onClick={() => onTogglePayment(order._id)}
                    className={`px-3 py-1 text-xs rounded font-semibold ${order.isPaid
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                  >
                    {order.isPaid ? 'Paid' : 'Mark as Paid'}
                  </button>
                )}
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
const CategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/categories?search=${searchTerm}`);
      setCategories(res.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [searchTerm]);

  // Handle create category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    try {
      setIsSubmitting(true);
      await api.post('/categories', newCategory);
      setNewCategory({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.response?.data?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update category
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory?.name?.trim()) return;

    try {
      setIsSubmitting(true);
      await api.put(`/categories/${editingCategory._id}`, {
        name: editingCategory.name,
        description: editingCategory.description,
        isActive: editingCategory.isActive
      });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert(error.response?.data?.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete category (hard delete if no products)
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This will permanently remove the category if there are no products in it. This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/categories/${categoryId}`);

      if (response.data.success) {
        // Show success message
        alert(response.data.message || 'Category deleted successfully');

        // Refresh the categories list
        await fetchCategories();
      } else {
        // Handle case where success is false but no error was thrown
        alert(response.data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);

      // More detailed error handling
      const errorMessage = error.response?.data?.message ||
        (error.response?.status === 400
          ? 'Cannot delete category with active products. Please deactivate or move the products first.'
          : 'Failed to delete category. Please try again.');

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Toggle category status
  const toggleCategoryStatus = async (category) => {
    try {
      await api.put(`/categories/${category._id}`, {
        isActive: !category.isActive
      });
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      alert('Failed to update category status');
    }
  };

  if (loading && categories.length === 0) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Category Management</h2>
        <div className="w-64">
          <label htmlFor="category-search" className="sr-only">Search categories</label>
          <input
            id="category-search"
            name="categorySearch"
            type="search"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search categories"
          />
        </div>
      </div>

      {/* Add/Edit Category Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </h3>
        <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="category-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category Name *
              </label>
              <input
                id="category-name"
                name="categoryName"
                type="text"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) =>
                  editingCategory
                    ? setEditingCategory({ ...editingCategory, name: e.target.value })
                    : setNewCategory({ ...newCategory, name: e.target.value })
                }
                required
                aria-label="Category name"
                placeholder="Enter category name"
              />
            </div>
            <div>
              <label
                htmlFor="category-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <input
                id="category-description"
                name="categoryDescription"
                type="text"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingCategory ? editingCategory.description : newCategory.description}
                onChange={(e) =>
                  editingCategory
                    ? setEditingCategory({ ...editingCategory, description: e.target.value })
                    : setNewCategory({ ...newCategory, description: e.target.value })
                }
                aria-label="Category description"
                placeholder="Enter description (optional)"
              />
            </div>
          </div>

          {editingCategory && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={editingCategory.isActive}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                aria-label="Category active status"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">All Categories</h3>
        </div>

        {categories.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No categories found. Add a new category to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => (
              <div key={category._id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span className={`font-medium ${!category.isActive ? 'text-gray-400' : 'text-gray-900'}`}>
                      {category.name}
                    </span>
                    {!category.isActive && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleCategoryStatus(category)}
                    className={`px-3 py-1 text-sm rounded-md ${category.isActive
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                  >
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category._id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Reports Tab Component
const ReportsTab = ({ orders, products, users }) => {
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState({
    sales: {},
    topProducts: [],
    topCategories: [],
    loading: true
  });
  const [activeChart, setActiveChart] = useState('sales');

  // In the fetchReportData function, update the categories data processing:
  const fetchReportData = async () => {
    try {
      setReportData(prev => ({ ...prev, loading: true }));

      const [salesRes, productsRes, categoriesRes] = await Promise.all([
        api.get(`/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        api.get(`/reports/top-products?limit=5&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        api.get(`/reports/top-categories?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      ]);

      // Process top products data
      const productsData = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : Array.isArray(productsRes.data)
          ? productsRes.data
          : [];

      const processedTopProducts = productsData.map(product => ({
        id: product._id || product.id || Math.random().toString(36).substr(2, 9),
        name: product.name || 'Unknown Product',
        quantitySold: Number(product.quantitySold || product.sold || product.quantity || 0),
        price: Number(product.price || 0),
        totalSales: Number(product.totalSales || (product.price || 0) * (product.quantitySold || 0)),
        image: product.images?.[0] || product.image || ''
      }));

      // Process categories data
      const categoriesData = Array.isArray(categoriesRes.data?.data)
        ? categoriesRes.data.data
        : Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : [];

      const processedCategories = categoriesData
        .filter(cat => cat && cat.name)
        .map(cat => ({
          ...cat,
          name: String(cat.name || '').trim(),
          totalSales: Number(cat.totalSales || 0),
          orderCount: Number(cat.orderCount || 0),
          productCount: Number(cat.productCount || 0),
          // Add these fields for the chart tooltip
          sales: Number(cat.totalSales || 0),
          orders: Number(cat.orderCount || 0),
          products: Number(cat.productCount || 0)
        }))
        .sort((a, b) => b.totalSales - a.totalSales);

      setReportData({
        sales: {
          ...salesRes.data,
          salesByDate: salesRes.data.salesTrend?.reduce((acc, { date, sales }) => {
            acc[date] = sales;
            return acc;
          }, {}) || {}
        },
        topProducts: processedTopProducts,
        topCategories: processedCategories,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const exportToCSV = async () => {
    try {
      const response = await api.get(
        `/reports/export?type=sales&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const { sales = {}, topProducts = [], topCategories = [], loading } = reportData;

  // Handle both old and new sales data structure
  const salesByDate = sales.salesByDate ||
    (sales.salesTrend ?
      sales.salesTrend.reduce((acc, { date, sales }) => {
        acc[date] = sales;
        return acc;
      }, {}) :
      {});

  const salesDates = Object.keys(salesByDate);
  const salesData = Object.values(salesByDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm font-medium">From:</label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="border rounded px-2 py-1 text-sm"
              max={dateRange.endDate}
              aria-label="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm font-medium">To:</label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="border rounded px-2 py-1 text-sm"
              min={dateRange.startDate}
              max={new Date().toISOString().split('T')[0]}
              aria-label="End date"
            />
          </div>
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Sales</h3>
              <p className="text-2xl font-bold">{formatPricePKR(sales.totalSales || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
              <p className="text-2xl font-bold">{sales.totalOrders || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Avg. Order Value</h3>
              <p className="text-2xl font-bold">{formatPricePKR(sales.avgOrderValue || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Top Selling Category</h3>
              <p className="text-2xl font-bold">
                {sales.topSellingCategory || 'N/A'}
              </p>
            </div>
          </div>

          {/* Chart Tabs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 font-medium ${activeChart === 'sales' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveChart('sales')}
              >
                Sales Trend
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeChart === 'products' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveChart('products')}
              >
                Top Products
              </button>
            </div>

            <div className="h-80">
              {activeChart === 'sales' && (
                <div className="h-full">
                  <h3 className="text-lg font-medium mb-4">Sales Trend</h3>
                  {salesDates.length > 0 ? (
                    <div className="h-64">
                      <LineChart
                        width="100%"
                        height="100%"
                        data={sales.salesTrend || salesDates.map((date, i) => ({
                          date,
                          sales: salesData[i] || 0
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatPricePKR(value), 'Sales']} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          name="Sales"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No sales data available for the selected date range
                    </div>
                  )}
                </div>
              )}

              {activeChart === 'products' && (
                <div className="h-full">
                  <h3 className="text-lg font-medium mb-4">Top Selling Products</h3>
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : topProducts && topProducts.length > 0 ? (
                    <div className="h-64">
                      <BarChart
                        width="100%"
                        height="100%"
                        data={topProducts.map(product => {
                          // Ensure we have numeric values for the chart
                          const quantitySold = Number(product.quantitySold || product.totalQuantity || 0);
                          const price = Number(product.price || 0);
                          const totalSales = Number(product.totalSales || (price * quantitySold) || 0);

                          return {
                            ...product,
                            displayName: product.name && product.name.length > 20
                              ? `${product.name.substring(0, 20)}...`
                              : product.name || 'Unknown Product',
                            quantitySold,
                            price,
                            totalSales
                          };
                        })}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barGap={4}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => Math.round(value)}
                        />
                        <YAxis
                          type="category"
                          dataKey="displayName"
                          width={200}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          labelFormatter={(label) => `Product: ${label}`}
                          contentStyle={{
                            padding: '10px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                          formatter={(value, name, item) => {
                            // Don't show the default tooltip items
                            return null;
                          }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;

                            // Get the first payload item which contains all the data
                            const data = payload[0].payload;

                            return (
                              <div className="space-y-1 bg-white">
                                <div className="font-semibold">Product: {label}</div>
                                <div className="flex items-center">
                                  <span className="inline-block w-3 h-3 mr-2 bg-green-500 rounded-full"></span>
                                  <span>Product Price (PKR): {Number(data.price || 0).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="inline-block w-3 h-3 mr-2 bg-blue-500 rounded-full"></span>
                                  <span>Quantity Sold: {Math.round(Number(data.quantitySold || 0))}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="inline-block w-3 h-3 mr-2 bg-purple-500 rounded-full"></span>
                                  <span>Total Sale (PKR): {(Number(data.price || 0) * Number(data.quantitySold || 0)).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Legend
                          formatter={(value) => {
                            let color;
                            if (value === 'Product Price (PKR)') {
                              color = '#10b981';
                            } else if (value === 'Total Sales (PKR)') {
                              color = '#8b5cf6';
                            } else {
                              color = '#3b82f6';
                            }
                            return <span style={{ color }}>{value}</span>;
                          }}
                        />
                        {/* Price Bar (Green) */}
                        <Bar
                          dataKey="price"
                          name="Product Price (PKR)"
                          fill="#10b981"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                        {/* Total Sales Bar (Purple) */}
                        <Bar
                          dataKey="totalSales"
                          name="Total Sales (PKR)"
                          fill="#8b5cf6"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                        {/* Quantity Sold Bar (Blue) */}
                        <Bar
                          dataKey="quantitySold"
                          name="Quantity Sold"
                          fill="#3b82f6"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
                      <svg className="w-12 h-12 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">No product data available</p>
                      <p className="text-sm mt-1">No sales data found for the selected date range</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.recentOrders?.length > 0 ? (
                      sales.recentOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {order._id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.user?.name || 'Guest'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="space-y-1">
                              {order.orderItems.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-center">
                                  <span className="truncate max-w-xs">
                                    {item.quantity} × {item.name}
                                  </span>
                                </div>
                              ))}
                              {order.orderItems.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{order.orderItems.length - 2} more items
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {formatPricePKR(order.totalPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                          No recent orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


export default AdminDashboard;
