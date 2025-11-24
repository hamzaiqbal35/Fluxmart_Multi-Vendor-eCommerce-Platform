# Multi-Vendor eCommerce Platform - Server

This is the backend server for the Apexcify Multi-Vendor eCommerce Platform, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Vendor Management**: Handle vendor registration, authentication, and profile management
- **Product Management**: CRUD operations for products with categories and variants
- **Order Processing**: Handle customer orders, payments, and order status updates
- **User Authentication**: JWT-based authentication for vendors and admin
- **File Uploads**: Handle product images and vendor documents
- **Admin Dashboard**: Administrative controls and analytics

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local file system (can be extended to AWS S3)
- **API Documentation**: Swagger/OpenAPI (if implemented)

## 📂 Project Structure

```
server/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/           # Database models
├── routes/           # API routes
├── uploads/          # File uploads directory
│   ├── avatars/      # User/vendor profile pictures
│   ├── products/     # Product images
│   └── documents/    # Vendor documents
├── .env              # Environment variables
├── app.js            # Main application file
└── server.js         # Server entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Create a `.env` file in the server root and configure the environment variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new vendor
- `POST /api/auth/login` - Login user/vendor
- `GET /api/auth/me` - Get current user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product (vendor only)
- `PUT /api/products/:id` - Update product (vendor only)
- `DELETE /api/products/:id` - Delete product (vendor only)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

## 🔒 Environment Variables

Create a `.env` file in the root directory and add the following:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
```

## 🧪 Testing

To run tests:
```bash
npm test
```

## 🛡️ Security

- Input validation on all routes
- Rate limiting for API endpoints
- Helmet for setting secure HTTP headers
- CORS enabled with appropriate configuration
- Data sanitization against XSS
- Secure HTTP headers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For any queries, please contact the development team.