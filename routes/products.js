const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { upload, getImageUrl, deleteImage, processUploadedImages } = require('../config/storage');

const productValidation = [
    body('product_name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 255 }),
    body('brand_name').trim().notEmpty().withMessage('Brand name is required').isLength({ max: 50 }),
    body('style').trim().isLength({ max: 100 }),
    body('colors').trim().notEmpty().withMessage('Colors are required').isLength({ max: 255 }),
    body('fabric').trim().notEmpty().withMessage('Fabric is required').isLength({ max: 255 }),
    body('sizes').trim().notEmpty().withMessage('Sizes are required').isLength({ max: 100 }),
    body('description').trim().isLength({ max: 5000 }),
];

const parseImages = (raw) => {
    try {
        return JSON.parse(raw) || [];
    } catch {
        return [];
    }
};

// Public routes (no authentication required)
const publicRouter = express.Router();

// Get all products with pagination
publicRouter.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const [rows] = await pool.query(
            'SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM products');

        res.json({ data: rows, total, page, limit });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get products by brand
publicRouter.get('/brand/:brandName', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE brand_name = ?', [req.params.brandName]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products by brand:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get products by style
publicRouter.get('/style/:style', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE style = ?', [req.params.style]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products by style:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search products by name
publicRouter.get('/search/:query', async (req, res) => {
    try {
        const q = req.params.query.trim().slice(0, 100);
        if (!q) return res.json([]);
        const query = `%${q}%`;
        const [rows] = await pool.query(
            'SELECT * FROM products WHERE product_name LIKE ? OR brand_name LIKE ? OR description LIKE ?',
            [query, query, query]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product by ID
publicRouter.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected routes (require authentication and admin privileges)

// Create new product with image upload
router.post('/', upload.array('images', 5), processUploadedImages, productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const imageUrls = req.processedFiles ? req.processedFiles.map(file => getImageUrl(file.filename)) : [];
        const { product_name, brand_name, style, colors, fabric, sizes, description } = req.body;

        const [result] = await pool.query(
            'INSERT INTO products (product_name, brand_name, style, colors, images, fabric, sizes, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [product_name, brand_name, style, colors, JSON.stringify(imageUrls), fabric, sizes, description]
        );

        const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product with image upload
router.put('/:id', upload.array('images', 5), processUploadedImages, productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { product_name, brand_name, style, colors, fabric, sizes, description } = req.body;

        const [existingProduct] = await pool.query('SELECT images FROM products WHERE id = ?', [req.params.id]);

        if (existingProduct.length === 0) {
            if (req.processedFiles) {
                for (const file of req.processedFiles) await deleteImage(file.filename);
            }
            return res.status(404).json({ error: 'Product not found' });
        }

        let imageUrls;
        if (req.processedFiles && req.processedFiles.length > 0) {
            imageUrls = req.processedFiles.map(file => getImageUrl(file.filename));
            for (const oldImageUrl of parseImages(existingProduct[0].images)) {
                await deleteImage(oldImageUrl.split('/').pop());
            }
        } else {
            imageUrls = parseImages(existingProduct[0].images);
        }

        await pool.query(
            'UPDATE products SET product_name = ?, brand_name = ?, style = ?, colors = ?, images = ?, fabric = ?, sizes = ?, description = ? WHERE id = ?',
            [product_name, brand_name, style, colors, JSON.stringify(imageUrls), fabric, sizes, description, req.params.id]
        );

        const [updatedProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(updatedProduct[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (with image cleanup)
router.delete('/:id', async (req, res) => {
    try {
        const [product] = await pool.query('SELECT images FROM products WHERE id = ?', [req.params.id]);

        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        for (const imageUrl of parseImages(product[0].images)) {
            await deleteImage(imageUrl.split('/').pop());
        }

        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { publicRouter, protectedRouter: router };
