const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify token version — incremented on logout and password change
        const [[user]] = await pool.query(
            'SELECT token_version FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user || decoded.tokenVersion !== user.token_version) {
            return res.status(401).json({ error: 'Token has been invalidated' });
        }

        req.user = {
            id: decoded.userId,
            username: decoded.username,
            role: decoded.role,
        };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = {
    auth,
    requireAdmin
}; 