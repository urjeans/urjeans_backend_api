# Urjeans Backend API

A Node.js backend API for the Urjeans website with authentication, product management, and image processing capabilities.

## Features

- 🔐 JWT Authentication
- 📦 Product Management
- 🖼️ Image Processing with Sharp
- 🗄️ MySQL Database
- 🛡️ Security with Helmet
- 📝 Input Validation
- 🔄 PM2 Process Management

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- MySQL Database
- PM2 (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Run the database setup script
   ./database/setup.sh
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Deployment

### Automatic Deployment

Use the provided deployment script:
```bash
./deploy.sh
```

### Manual Deployment

1. **Install production dependencies**
   ```bash
   npm install --production
   ```

2. **Fix Sharp module for Linux**
   ```bash
   npm rebuild sharp --platform=linux --arch=x64
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

### Quick Fix for Common Issues

If you encounter deployment issues, run the quick fix script:
```bash
./scripts/quick-fix.sh
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password (authenticated)
- `GET /api/auth/me` - Get current user info (authenticated)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (authenticated)
- `PUT /api/products/:id` - Update product (authenticated)
- `DELETE /api/products/:id` - Delete product (authenticated)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=urjeans_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Troubleshooting

### Common Issues

1. **Sharp Module Error**
   ```bash
   ./scripts/fix-sharp.sh
   ```

2. **Express Module Not Found**
   ```bash
   rm -rf node_modules package-lock.json
   npm install --production
   ```

3. **Database Connection Issues**
   - Check your `.env` file
   - Ensure MySQL is running
   - Verify database credentials

4. **Bcryptjs Error**
   - Ensure password fields are not undefined
   - Check database for proper password_hash values

### Debugging Commands

```bash
# View PM2 logs
pm2 logs urjeans-backend

# Check application status
pm2 status

# Test database connection
node -e "require('./config/database').pool.query('SELECT 1', console.log)"

# Test Sharp module
node -e "console.log(require('sharp').versions.sharp)"
```

## Project Structure

```
backend/
├── config/           # Configuration files
├── database/         # Database setup and migrations
├── middleware/       # Custom middleware
├── routes/           # API routes
├── scripts/          # Utility scripts
├── uploads/          # File uploads directory
├── logs/             # Application logs
├── server.js         # Main application file
├── ecosystem.config.js # PM2 configuration
└── deploy.sh         # Deployment script
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For deployment issues, refer to [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)
