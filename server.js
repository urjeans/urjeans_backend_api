const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/database');
const { publicRouter: productsPublicRouter, protectedRouter: productsProtectedRouter } = require('./routes/products');
const { publicRouter: contentPublicRouter, protectedRouter: contentProtectedRouter } = require('./routes/content');
const authRouter = require('./routes/auth');
const { auth, requireAdmin } = require('./middleware/auth');

// Validate required environment variables at startup
['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'].forEach(k => {
    if (!process.env[k]) {
        console.error(`Missing required environment variable: ${k}`);
        process.exit(1);
    }
});

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

// Request logging
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
    origin: [
        'https://urjeans.uz',
        'https://www.urjeans.uz',
        'http://urjeans.uz',
        'http://www.urjeans.uz',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || 'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
}, express.static(path.join(__dirname, 'uploads')));

// Test database connection
testConnection();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Auth routes
app.use('/api/auth', authRouter);

// Public product routes (no authentication required)
app.use('/api/products', productsPublicRouter);

// Protected product routes (admin only)
app.use('/api/products', auth, requireAdmin, productsProtectedRouter);

// Public content routes (sliders + gallery — frontend reads these)
app.use('/api/content', contentPublicRouter);

// Protected content routes (admin only — manage sliders + gallery)
app.use('/api/content', auth, requireAdmin, contentProtectedRouter);

// Root
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
    res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check available at: http://${HOST}:${PORT}/health`);
});
