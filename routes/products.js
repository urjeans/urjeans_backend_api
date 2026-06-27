const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { upload, getImageUrl, deleteImage, processUploadedImages } = require('../config/storage');

// mysql2 auto-parses JSON columns — guard in case value is already an array
const toArray = (val) => Array.isArray(val) ? val : [];

// Parse color_ids from form data — accepts JSON array string or comma-separated
const parseIds = (val) => {
    if (!val) return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch {
        return val.split(',').map(s => Number(s.trim())).filter(Boolean);
    }
};

const parseJsonOrCsv = (val) => {
    if (!val) return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
        return val.split(',').map(s => s.trim()).filter(Boolean);
    }
};

const productValidation = [
    body('product_name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 255 }),
    body('brand_id').notEmpty().withMessage('Brand is required').isInt({ min: 1 }).withMessage('Invalid brand'),
    body('style').optional().trim().isLength({ max: 50 }),
    body('color_ids').notEmpty().withMessage('At least one color is required'),
    body('fabric').trim().notEmpty().withMessage('Fabric is required').isLength({ max: 255 }),
    body('sizes').notEmpty().withMessage('Sizes are required'),
    body('description').optional().trim().isLength({ max: 5000 }),
];

// Subquery that returns colors as a JSON array for a given product
const COLORS_SUBQUERY = `
    (SELECT COALESCE(
        JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'code', c.code)),
        JSON_ARRAY()
    )
    FROM product_colors pc
    JOIN colors c ON pc.color_id = c.id
    WHERE pc.product_id = p.id) AS colors`;

// JOIN helper — every public read includes brand info and colors
const WITH_BRAND = `
    SELECT p.id, p.product_name, p.brand_id, b.name AS brand_name, b.slug AS brand_slug,
           p.style, p.images, p.fabric, p.sizes, p.description,
           p.deleted_at, p.created_at, p.updated_at,
           ${COLORS_SUBQUERY}
    FROM products p
    JOIN brands b ON p.brand_id = b.id`;

// Insert color IDs into product_colors within the given connection
const insertProductColors = async (conn, productId, colorIds) => {
    if (!colorIds.length) return;
    const values = colorIds.map(cid => [productId, cid]);
    await conn.query('INSERT INTO product_colors (product_id, color_id) VALUES ?', [values]);
};

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
const publicRouter = express.Router();

// GET /api/products
publicRouter.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL'
        );

        res.json({ data: rows, total, page, limit });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/brand/:slug
publicRouter.get('/brand/:slug', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE b.slug = ? AND p.deleted_at IS NULL ORDER BY p.created_at DESC`,
            [req.params.slug]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products by brand:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/style/:style
publicRouter.get('/style/:style', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE p.style = ? AND p.deleted_at IS NULL`,
            [req.params.style]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products by style:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/search/:query
publicRouter.get('/search/:query', async (req, res) => {
    try {
        const q = req.params.query.trim().slice(0, 100);
        if (!q) return res.json([]);
        const [rows] = await pool.query(
            `${WITH_BRAND}
             WHERE p.deleted_at IS NULL
               AND MATCH(p.product_name, p.description) AGAINST(? IN BOOLEAN MODE)`,
            [q]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id
publicRouter.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE p.id = ? AND p.deleted_at IS NULL`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// Protected routes (admin only)
// ---------------------------------------------------------------------------

// POST /api/products
router.post('/', upload.array('images', 5), processUploadedImages, productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { product_name, brand_id, style, color_ids, fabric, sizes, description } = req.body;
        const colorIds = parseIds(color_ids);
        const imageUrls = req.processedFiles ? req.processedFiles.map(f => getImageUrl(f.filename)) : [];

        const [result] = await conn.query(
            'INSERT INTO products (product_name, brand_id, style, images, fabric, sizes, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                product_name,
                brand_id,
                style || '',
                JSON.stringify(imageUrls),
                fabric,
                JSON.stringify(parseJsonOrCsv(sizes)),
                description || null,
            ]
        );

        await insertProductColors(conn, result.insertId, colorIds);
        await conn.commit();

        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE p.id = ? AND p.deleted_at IS NULL`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        await conn.rollback();
        console.error('Error creating product:', error);
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Invalid brand ID or color ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// PUT /api/products/:id
router.put('/:id', upload.array('images', 5), processUploadedImages, productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existing] = await conn.query(
            'SELECT images FROM products WHERE id = ? AND deleted_at IS NULL',
            [req.params.id]
        );

        if (existing.length === 0) {
            await conn.rollback();
            if (req.processedFiles) {
                for (const file of req.processedFiles) await deleteImage(file.filename);
            }
            return res.status(404).json({ error: 'Product not found' });
        }

        const currentImages = toArray(existing[0].images);

        // existingImages: JSON array of current URLs the client wants to keep.
        // If omitted, all current images are retained.
        let keptImages;
        if (req.body.existingImages !== undefined) {
            try {
                const parsed = JSON.parse(req.body.existingImages);
                keptImages = Array.isArray(parsed)
                    ? parsed.filter(url => currentImages.includes(url))
                    : [];
            } catch {
                keptImages = [];
            }
        } else {
            keptImages = currentImages;
        }

        const newUploadUrls = req.processedFiles
            ? req.processedFiles.map(f => getImageUrl(f.filename))
            : [];

        const imageUrls = [...keptImages, ...newUploadUrls];
        const oldFilesToDelete = currentImages
            .filter(url => !keptImages.includes(url))
            .map(url => url.split('/').pop());

        const { product_name, brand_id, style, color_ids, fabric, sizes, description } = req.body;
        const colorIds = parseIds(color_ids);

        await conn.query(
            'UPDATE products SET product_name = ?, brand_id = ?, style = ?, images = ?, fabric = ?, sizes = ?, description = ? WHERE id = ?',
            [
                product_name,
                brand_id,
                style || '',
                JSON.stringify(imageUrls),
                fabric,
                JSON.stringify(parseJsonOrCsv(sizes)),
                description || null,
                req.params.id,
            ]
        );

        // Replace colors: delete existing then insert new
        await conn.query('DELETE FROM product_colors WHERE product_id = ?', [req.params.id]);
        await insertProductColors(conn, Number(req.params.id), colorIds);

        await conn.commit();

        for (const filename of oldFilesToDelete) {
            await deleteImage(filename);
        }

        const [rows] = await pool.query(
            `${WITH_BRAND} WHERE p.id = ? AND p.deleted_at IS NULL`,
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (error) {
        await conn.rollback();
        console.error('Error updating product:', error);
        if (req.processedFiles) {
            for (const file of req.processedFiles) await deleteImage(file.filename);
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Invalid brand ID or color ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// DELETE /api/products/:id  (soft delete — keeps row, frees image storage)
router.delete('/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [product] = await conn.query(
            'SELECT images FROM products WHERE id = ? AND deleted_at IS NULL',
            [req.params.id]
        );

        if (product.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        const filesToDelete = toArray(product[0].images).map(url => url.split('/').pop());

        await conn.query(
            'UPDATE products SET deleted_at = NOW(), images = ? WHERE id = ?',
            [JSON.stringify([]), req.params.id]
        );
        await conn.commit();

        for (const filename of filesToDelete) {
            await deleteImage(filename);
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

module.exports = { publicRouter, protectedRouter: router };
