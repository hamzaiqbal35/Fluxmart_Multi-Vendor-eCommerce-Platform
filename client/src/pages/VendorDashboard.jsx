import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import ProtectedRoute from '../components/ProtectedRoute';
import { formatPricePKR } from '../utils/currency';

const VendorDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const vendorProducts = res.data.products.filter(p => 
        p.vendor._id === currentUser.id || p.vendor._id === currentUser._id
      );
      setProducts(vendorProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/all');
      setOrders(res.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // UPDATED: Payment toggle function
  const handleTogglePayment = async (orderId) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/pay`);
      setOrders(orders.map((order) => (order._id === data._id ? data : order)));
    } catch (error) {
      console.error('Error toggling payment:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  return (
    <ProtectedRoute requiredRole="vendor">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-semibold ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            My Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-semibold ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Orders
          </button>
        </div>

        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Products</h2>
              <Link
                to="/vendor/products/new"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add New Product
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading products...</div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300'}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                      <p className="text-blue-600 font-bold mb-2">{formatPricePKR(product.price)}</p>
                      <p className="text-sm text-gray-600 mb-2">Stock: {product.stock}</p>
                      <p className={`text-sm mb-4 ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </p>
                      <div className="flex space-x-2">
                        <Link
                          to={`/vendor/products/${product._id}/edit`}
                          className="flex-1 text-center bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No products yet.</p>
                <Link
                  to="/vendor/products/new"
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Add your first product →
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Orders</h2>
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Order #{order._id.slice(-8)}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="border-t pt-4">
                      {order.orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between mb-2">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatPricePKR(item.price * item.quantity)}</span>
                        </div>
                      ))}

                      <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                        <span>Total</span>
                        <span>{formatPricePKR(order.totalPrice)}</span>
                      </div>

                      <div className="flex justify-end mt-4 space-x-2">

                        {order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleTogglePayment(order._id)}
                            className={`px-3 py-2 text-white rounded text-sm font-semibold 
                              ${order.isPaid ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {order.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                          </button>
                        )}


                        <Link
                          to={`/orders/${order._id}`}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                        >
                          View Order
                        </Link>

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No orders yet.</p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default VendorDashboard;
