import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { formatPricePKR } from '../utils/currency';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [updatedItems, setUpdatedItems] = useState([]);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.order);
      setUpdatedItems(res.data.order.orderItems);
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const canEditOrder = (status) => {
    return status === 'pending' && order && !order.isPaid;
  };

  const canCancelOrder = (status) => {
    return ['pending', 'accepted'].includes(status);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      await api.put(`/orders/${id}/cancel`, { reason: cancelReason });
      setShowCancelModal(false);
      await fetchOrder();
      alert('Order cancelled successfully. Refund will be processed within 5-7 business days.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!window.confirm('Are you sure you want to save these changes?')) {
      return;
    }
    try {
      await api.put(`/orders/${id}`, { orderItems: updatedItems });
      await fetchOrder();
      setEditingItems(false);
      alert('Order updated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update order');
    }
  };

  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const item = updatedItems[index];
    if (newQuantity > (item.product?.stock || 0)) {
      alert(`Only ${item.product.stock} items available in stock.`);
      return;
    }
    const updated = [...updatedItems];
    updated[index].quantity = newQuantity;
    setUpdatedItems(updated);
  };

  const handleRemoveItem = (index) => {
    if (!window.confirm('Are you sure you want to remove this item?')) {
      return;
    }
    if (updatedItems.length === 1) {
      alert('Cannot remove all items from order. Cancel the order instead.');
      return;
    }
    setUpdatedItems(updatedItems.filter((_, i) => i !== index));
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-indigo-100 text-indigo-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading order details...</div>;
  }

  if (!order) {
    return <div className="container mx-auto px-4 py-12 text-center">Order not found</div>;
  }

  const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const newTaxPrice = newTotal * 0.1;
  const newTotalPrice = newTotal + order.shippingPrice + newTaxPrice;

  return (
    <div className="container mx-auto px-4 py-8">
      {user && user.role !== 'vendor' && user.role !== 'admin' && (
        <button
          onClick={() => navigate('/orders')}
          className="mb-4 text-blue-600 hover:text-blue-800 font-semibold"
        >
          ← Back to Orders
        </button>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Order #{order._id?.slice(-8) || 'N/A'}</h1>
            <p className="text-gray-600">
              Placed on {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
            </p>
          </div>
          <span
            className={`mt-2 md:mt-0 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}
            aria-label={`Order status: ${order.status || 'unknown'}`}
          >
            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
          </span>
        </div>

        {/* Action Buttons - VISIBLE HERE */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {user && user.role !== 'vendor' && user.role !== 'admin' && canEditOrder(order.status) && !editingItems && (
            <button
              onClick={() => setEditingItems(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              aria-label="Edit Order"
            >
              ✏️ Edit Order
            </button>
          )}
          {user && user.role !== 'vendor' && canCancelOrder(order.status) && !editingItems && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              aria-label="Cancel Order"
            >
              ❌ Cancel Order
            </button>
          )}
          {editingItems && (
            <>
              <button
                onClick={handleUpdateOrder}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                ✓ Save Changes
              </button>
              <button
                onClick={() => {
                  setEditingItems(false);
                  setUpdatedItems(order.orderItems);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                ✕ Cancel Edit
              </button>
            </>
          )}
        </div>

        {order.trackingNumber && (
          <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">🚚 Shipping Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Courier</p>
                <p className="font-medium">{order.courier || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-mono font-medium">{order.trackingNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Delivery</p>
                <p className="font-medium">
                  {order.estimatedDeliveryDate
                    ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingItems ? '✏️ Edit Order Items' : '📦 Order Items'}
            </h2>
            <div className="space-y-4">
              {updatedItems && updatedItems.length > 0 ? (
                updatedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div className="flex items-center space-x-4 flex-1">
                      <img
                        src={item.image || 'https://via.placeholder.com/100'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">Price: {formatPricePKR(item.price)}</p>
                        {item.vendor && (
                          <p className="text-sm text-gray-500 mt-1">
                            Vendor: {typeof item.vendor === 'object' ? item.vendor.name : 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>

                    {editingItems ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 border rounded">
                          <button
                            onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-gray-100"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 min-w-[40px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="ml-2 px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Qty: {item.quantity}</p>
                        <p className="font-semibold text-lg">{formatPricePKR(item.price * item.quantity)}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No items in order</p>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4">📋 Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Items Price</span>
                <span>{formatPricePKR(editingItems ? newTotal : order.itemsPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatPricePKR(order.shippingPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPricePKR(editingItems ? newTaxPrice : order.taxPrice)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPricePKR(editingItems ? newTotalPrice : order.totalPrice)}</span>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">📍 Shipping Address</h3>
              <p className="text-sm text-gray-600">
                {order.shippingAddress?.street}<br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}<br />
                {order.shippingAddress?.country}
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">💳 Payment Method</h3>
              <p className="text-sm text-gray-600 capitalize">
                {order.paymentMethod?.replace('_', ' ') || 'Not specified'}
              </p>
              {order.isPaid ? (
                <p className="text-green-600 text-sm mt-1">✓ Paid on {new Date(order.paidAt).toLocaleDateString()}</p>
              ) : (
                <p className="text-yellow-600 text-sm mt-1">⚠ Not Paid</p>
              )}
            </div>

            {order.isDelivered && (
              <div className="border-t pt-4 mt-4">
                <p className="text-green-600 text-sm">
                  ✓ Delivered on {new Date(order.deliveredAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {order.status === 'cancelled' && order.cancellationReason && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2 text-red-600">❌ Cancellation Reason</h3>
                <p className="text-sm text-gray-600">{order.cancellationReason}</p>
              </div>
            )}
          </div>
        </div>

        {(order.status === 'delivered' || order.isDelivered) && order.deliveredAt && (
          <div className="border-t pt-4 mt-4">
            <p className="text-green-600 text-sm">
              ✓ Delivered on {new Date(order.deliveredAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">❌ Cancel Order</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this order? A full refund will be processed within 5-7 business days.
            </p>

            <div className="mb-4">
              <label className="block font-semibold mb-2">Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please tell us why you're cancelling..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                rows="4"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;

