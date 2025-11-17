# Multi-Vendor eCommerce Platform

A full-stack e-commerce platform with support for multiple vendors, customers, and administrators. Built with React, Node.js, Express, and MongoDB.

## Features

### Core Features
- ✅ Shopping cart functionality
- ✅ Product details page with reviews and ratings
- ✅ Order processing and tracking
- ✅ Vendor & Customer roles
- ✅ Product listing by vendors
- ✅ Cart, checkout, and order tracking
- ✅ Admin dashboard to manage products, users, and orders
- ✅ Customer reviews & ratings
- ✅ Email notifications (configurable)
- ✅ Responsive mobile-first design
- ✅ MongoDB database for storing products, users, and orders

### User Roles
- **Customer**: Browse products, add to cart, place orders, leave reviews
- **Vendor**: Create and manage products, view orders
- **Admin**: Manage all users, products, and orders

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Nodemailer (for email notifications)

### Frontend
- React 19
- React Router
- Axios
- Tailwind CSS
- Context API (for state management)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "ApexcifyTechnologys_Multi-Vendor eCommerce Platform"
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**

   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRE=30d
   CLIENT_URL=http://localhost:5173
   
   # Optional: Email configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@ecommerce.com
   ```

   Create a `.env` file in the `client` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system or update `MONGODB_URI` in the `.env` file to point to your MongoDB instance.

6. **Run the application**

   Start the server (from `server` directory):
   ```bash
   npm run dev
   ```

   Start the client (from `client` directory in a new terminal):
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (vendor/admin only)
- `PUT /api/products/:id` - Update product (vendor/admin only)
- `DELETE /api/products/:id` - Delete product (vendor/admin only)
- `POST /api/products/:id/reviews` - Add review (protected)

### Cart
- `GET /api/cart` - Get user cart (protected)
- `POST /api/cart` - Add item to cart (protected)
- `PUT /api/cart/:itemId` - Update cart item (protected)
- `DELETE /api/cart/:itemId` - Remove cart item (protected)
- `DELETE /api/cart` - Clear cart (protected)

### Orders
- `POST /api/orders` - Create order (protected)
- `GET /api/orders/my-orders` - Get user orders (protected)
- `GET /api/orders/all` - Get all orders (vendor/admin only)
- `GET /api/orders/:id` - Get single order (protected)
- `PUT /api/orders/:id/status` - Update order status (vendor/admin only)

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (admin only)

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Context providers (Auth, Cart)
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── App.jsx        # Main app component
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic services
│   │   ├── utils/         # Utility functions
│   │   ├── app.js         # Express app setup
│   │   └── server.js      # Server entry point
│   └── package.json
│
└── README.md
```

## Features in Detail

### Shopping Cart
- Add/remove products
- Update quantities
- Real-time cart total calculation
- Persistent cart (stored in database)

### Product Management
- Vendors can create, update, and delete their products
- Product images, descriptions, pricing, and stock management
- Category-based filtering
- Search functionality

### Order Processing
- Multi-vendor order splitting
- Order status tracking (pending, processing, shipped, delivered)
- Tracking number support
- Email notifications on order status changes

### Reviews & Ratings
- Customers can leave reviews with ratings (1-5 stars)
- Average rating calculation
- Review display on product pages

### Admin Dashboard
- View all users, products, and orders
- Activate/deactivate user accounts
- System statistics overview

### Vendor Dashboard
- Manage products
- View orders for their products
- Product inventory management

## Email Notifications

Email notifications are optional. To enable:
1. Configure SMTP settings in `server/.env`
2. For Gmail, you'll need to generate an App Password
3. If not configured, emails will be logged to console

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes (role-based access control)
- Input validation
- CORS configuration

## Future Enhancements

- Payment gateway integration
- Image upload functionality
- Advanced search and filters
- Wishlist feature
- Product recommendations
- Vendor analytics
- Real-time notifications
- Multi-language support

## License

MIT

## Support

For issues and questions, please open an issue in the repository

