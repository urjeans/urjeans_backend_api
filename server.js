const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const { testConnection } = require('./config/database');
const { publicRouter: productsPublicRouter, protectedRouter: productsProtectedRouter } = require('./routes/products');
const authRouter = require('./routes/auth');
const { auth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:5500',  // Add this for development
        'http://127.0.0.1:5500'   // Also add this
    ],
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDirectory = path.join(__dirname, '../uploads');

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDirectory));

// Test database connection
testConnection();

// Health check endpoint for aHost monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Public routes
app.use('/api/auth', authRouter);

// Public product routes (viewing products - no authentication required)
app.use('/api/products', productsPublicRouter);

// Protected product routes (admin only - create, update, delete)
app.use('/api/products', auth, requireAdmin, productsProtectedRouter);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ 
        status: "API is running",
        message: "Urjeans Backend API",
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check available at: http://${HOST}:${PORT}/health`);
}); 