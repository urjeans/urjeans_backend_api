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

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
testConnection();

// Public routes
app.use('/api/auth', authRouter);

// Public product routes (viewing products - no authentication required)
app.use('/api/products', productsPublicRouter);

// Protected product routes (admin only - create, update, delete)
app.use('/api/products', auth, requireAdmin, productsProtectedRouter);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ status: "API is running" });
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 