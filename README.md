# 🛍️ Multi-Vendor eCommerce Platform

<div align="center">
  <p>
    <a href="#">
      <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
    </a>
  </p>
</div>

A full-featured multi-vendor eCommerce platform that enables vendors to sell their products and customers to browse and purchase items in a seamless shopping experience. Built with modern web technologies for optimal performance and scalability.

## ✨ Features

### 🛒 Core Features
- **Multi-Vendor Marketplace**: Multiple vendors can sign up and manage their products
- **User Authentication**: Secure JWT-based authentication for customers, vendors, and admins
- **Product Management**: Vendors can add, edit, and manage their product listings
- **Shopping Cart**: Persistent shopping cart with guest checkout support
- **Order Processing**: Complete order lifecycle management
- **Reviews & Ratings**: Customers can leave reviews and ratings for products
- **Admin Dashboard**: Comprehensive admin panel for platform management
- **Responsive Design**: Fully responsive UI that works on all devices

### 👥 User Roles
- **Customers**: Browse products, add to cart, place orders, leave reviews
- **Vendors**: Manage products, view orders, update order status
- **Administrators**: Manage users, products, orders, and platform settings

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Upload**: Multer
- **Email**: Nodemailer

## 🛠️ Project Structure

```
.
├── client/                 # Frontend React application
│   ├── public/             # Static files
│   └── src/                # Source code
│       ├── components/     # Reusable UI components
│       ├── context/        # React context providers
│       ├── pages/          # Page components
│       └── utils/          # Utility functions
│
└── server/                 # Backend Node.js/Express application
    ├── config/            # Configuration files
    ├── controllers/       # Route controllers
    ├── middleware/        # Custom middleware
    ├── models/            # Database models
    ├── routes/            # API routes
    └── uploads/           # File uploads directory
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6.0 or higher)
- npm (v9.0 or higher) or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hamzaiqbal35/ApexcifyTechnologys_Multi-Vendor-eCommerce-Platform.git
   git
   cd "ApexcifyTechnologys_Multi-Vendor eCommerce Platform"
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   - Create `.env` files in both `client` and `server` directories
   - Use the examples provided in `.env.example` files

4. **Start the development servers**
   ```bash
   # In the server directory
   npm run dev
   
   # In a new terminal, from the client directory
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs (if Swagger is configured)

## 📚 Documentation

- [API Documentation](server/README.md) - Detailed API endpoints and usage
- [Frontend Documentation](client/README.md) - Frontend architecture and components
- [Deployment Guide](DEPLOYMENT.md) - Instructions for deploying to production

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

For any questions or feedback, please reach out to our team at [contact@apexcify.com](mailto:contact@apexcify.com).

---

<div align="center">
  Made with ❤️ by Hamza Iqbal
</div>

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

