const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { upload, getImageUrl, deleteImage, processUploadedImages } = require('../config/storage');

// Public routes (no authentication required)
const publicRouter = express.Router();

// Get all products
publicRouter.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(rows);
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
router.post('/', upload.array('images', 5), processUploadedImages, async (req, res) => {
    try {
        // Get processed image URLs
        const imageUrls = req.processedFiles ? req.processedFiles.map(file => getImageUrl(file.filename)) : [];
        
        const { brand_name, colors, fabric, sizes, description } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO products (brand_name, colors, images, fabric, sizes, description) VALUES (?, ?, ?, ?, ?, ?)',
            [brand_name, colors, JSON.stringify(imageUrls), fabric, sizes, description]
        );
        
        const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        // If there's an error, delete processed images
        if (req.processedFiles) {
            for (const file of req.processedFiles) {
                deleteImage(file.filename);
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product with image upload
router.put('/:id', upload.array('images', 5), processUploadedImages, async (req, res) => {
    try {
        const { brand_name, colors, fabric, sizes, description } = req.body;
        
        // Get existing product to check current images
        const [existingProduct] = await pool.query('SELECT images FROM products WHERE id = ?', [req.params.id]);
        
        if (existingProduct.length === 0) {
            // If there are processed files, delete them
            if (req.processedFiles) {
                for (const file of req.processedFiles) {
                    deleteImage(file.filename);
                }
            }
            return res.status(404).json({ error: 'Product not found' });
        }

        // Handle image updates
        let imageUrls;
        if (req.processedFiles && req.processedFiles.length > 0) {
            // If new images are uploaded, use them
            imageUrls = req.processedFiles.map(file => getImageUrl(file.filename));
            
            // Delete old images
            const oldImages = JSON.parse(existingProduct[0].images);
            for (const oldImageUrl of oldImages) {
                const filename = oldImageUrl.split('/').pop();
                deleteImage(filename);
            }
        } else {
            // If no new images, keep existing ones
            imageUrls = JSON.parse(existingProduct[0].images);
        }

        // Update product
        await pool.query(
            'UPDATE products SET brand_name = ?, colors = ?, images = ?, fabric = ?, sizes = ?, description = ? WHERE id = ?',
            [brand_name, colors, JSON.stringify(imageUrls), fabric, sizes, description, req.params.id]
        );
        
        const [updatedProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(updatedProduct[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        // If there's an error, delete processed images
        if (req.processedFiles) {
            for (const file of req.processedFiles) {
                deleteImage(file.filename);
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (with image cleanup)
router.delete('/:id', async (req, res) => {
    try {
        // Get product images before deletion
        const [product] = await pool.query('SELECT images FROM products WHERE id = ?', [req.params.id]);
        
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Delete images
        const images = JSON.parse(product[0].images);
        for (const imageUrl of images) {
            const filename = imageUrl.split('/').pop();
            deleteImage(filename);
        }

        // Delete product from database
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { publicRouter, protectedRouter: router }; 