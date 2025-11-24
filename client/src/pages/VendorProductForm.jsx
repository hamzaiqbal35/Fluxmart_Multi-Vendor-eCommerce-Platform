import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import ProtectedRoute from '../components/ProtectedRoute';

const VendorProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [],
    tags: '',
    isActive: true
  });
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get('/categories');
        setCategories(res.data.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      const product = res.data.product;
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        images: product.images || [],
        tags: product.tags?.join(', ') || '',
        isActive: product.isActive
      });
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
      setFormData({
        ...formData,
        images: [...formData.images, imageUrl.trim()]
      });
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.images.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingImages(true);
    try {
      const formDataUpload = new FormData();
      selectedFiles.forEach(file => {
        formDataUpload.append('images', file);
      });

      const res = await api.post('/products/upload-images', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const uploadedUrls = res.data.images;
      setFormData({
        ...formData,
        images: [...formData.images, ...uploadedUrls]
      });
      setSelectedFiles([]);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (isEdit) {
        await api.put(`/products/${id}`, submitData);
      } else {
        await api.post('/products', submitData);
      }
      navigate('/vendor/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="vendor">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">
          {isEdit ? 'Edit Product' : 'Create New Product'}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <label htmlFor="product-name" className="block font-semibold mb-2">Product Name *</label>
            <input
              id="product-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="off"
              className="w-full px-3 py-2 border rounded"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="product-description" className="block font-semibold mb-2">Description *</label>
            <textarea
              id="product-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className="w-full px-3 py-2 border rounded"
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-price" className="block font-semibold mb-2">Price *</label>
              <input
                id="product-price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="product-stock" className="block font-semibold mb-2">Stock *</label>
              <input
                id="product-stock"
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border rounded"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="product-category" className="block font-semibold mb-2">Category *</label>
            {loadingCategories ? (
              <div className="w-full px-3 py-2 border rounded bg-gray-100 animate-pulse">
                Loading categories...
              </div>
            ) : (
              <select
                id="product-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded"
                aria-required="true"
              >
                <option value="">Select a category</option>
                {categories
                  .filter(category => category.isActive)
                  .map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Image Upload Section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Product Images (Max 5)</h2>

            {/* Add Image URL */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <label htmlFor="image-url" className="block font-medium mb-2">Add Image URL</label>
              <div className="flex gap-2">
                <input
                  id="image-url"
                  type="url"
                  name="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Display Current Images */}
            {formData.images.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Current Images ({formData.images.length}/5)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative border rounded p-2">
                      <img
                        src={img.startsWith('http') ? img : `${api.defaults.baseURL}${img}`}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                      >
                        ×
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {img.startsWith('http') ? 'External URL' : 'Uploaded'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="product-tags" className="block font-semibold mb-2">Tags (comma-separated)</label>
            <input
              id="product-tags"
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border rounded"
              autoComplete="off"
              aria-describedby="tags-help"
            />
            <p id="tags-help" className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          <div>
            <div className="flex items-center">
              <input
                id="product-active"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="product-active" className="ml-2 block text-sm text-gray-900">
                Product is active
              </label>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/vendor/dashboard')}
              className="px-6 py-3 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
};

export default VendorProductForm;