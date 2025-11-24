import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPricePKR } from '../utils/currency';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, isVendor, isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.product);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const VENDOR_BULK_MIN = 10;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }
    if (isVendor && quantity < VENDOR_BULK_MIN) {
      alert(`As a vendor, you can only place bulk orders. Minimum quantity is ${VENDOR_BULK_MIN}.`);
      return;
    }
    try {
      await addToCart(product._id, quantity);
      alert('Product added to cart!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please login to submit a review');
      return;
    }
    try {
      setSubmittingReview(true);
      await api.post(`/products/${id}/reviews`, review);
      await fetchProduct();
      setReview({ rating: 5, comment: '' });
      alert('Review submitted successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading...</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-12 text-center">Product not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div>
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/500'}
            alt={product.name}
            className="w-full rounded-lg shadow-md"
          />
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {product.images.slice(1, 5).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx + 2}`}
                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center mb-4">
            {product.averageRating > 0 && (
              <>
                <span className="text-yellow-400 text-2xl">★</span>
                <span className="ml-2 text-xl">{product.averageRating}</span>
                <span className="ml-2 text-gray-600">({product.numReviews} reviews)</span>
              </>
            )}
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-4">{formatPricePKR(product.price)}</p>
          <p className="text-gray-700 mb-6">{product.description}</p>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">Category: <span className="font-semibold">{product.category}</span></p>
            <p className={`text-sm font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </p>
            {product.vendor && (
              <p className="text-sm text-gray-600 mt-2">
                Sold by: <span className="font-semibold">{product.vendor.vendorInfo?.businessName || product.vendor.name}</span>
              </p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="product-quantity" className="font-semibold block mb-2">Quantity:</label>
            <input
              id="product-quantity"
              name="quantity"
              type="number"
              min={isVendor ? VENDOR_BULK_MIN : 1}
              max={product.stock}
              value={quantity}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                const min = isVendor ? VENDOR_BULK_MIN : 1;
                setQuantity(value < min ? min : value);
              }}
              className="w-20 px-3 py-2 border rounded"
              aria-label="Product quantity"
            />
          </div>

          {!isAdmin && (
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>
        
        {/* Add Review Form */}
        {isAuthenticated && (
          <form onSubmit={handleSubmitReview} className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
            <div className="mb-4">
              <label htmlFor="review-rating" className="block font-semibold mb-2">Rating</label>
              <select
                id="review-rating"
                name="rating"
                value={review.rating}
                onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value) })}
                className="px-3 py-2 border rounded"
                aria-label="Select rating"
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="review-comment" className="block font-semibold mb-2">Comment</label>
              <textarea
                id="review-comment"
                name="comment"
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                rows="4"
                className="w-full px-3 py-2 border rounded"
                placeholder="Share your thoughts about this product..."
                aria-label="Write your review"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-4">
            {product.reviews.map((review, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold">{review.user?.name || 'Anonymous'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-gray-700 mt-2">{review.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;

