const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { upload, getImageUrl, deleteImage, processImage } = require('../config/storage');

const publicRouter = express.Router();
const protectedRouter = express.Router();

const filenameFromUrl = (url) => url ? url.split('/').pop() : null;

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

// GET /api/content/brands
publicRouter.get('/brands', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM brands ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/content/brands/:slug
publicRouter.get('/brands/:slug', async (req, res) => {
    try {
        const [[brand]] = await pool.query('SELECT * FROM brands WHERE slug = ?', [req.params.slug]);
        if (!brand) return res.status(404).json({ error: 'Brand not found' });
        res.json(brand);
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/content/sliders?brand_id=<id>
// Omit brand_id → home page sliders (brand_id IS NULL)
publicRouter.get('/sliders', async (req, res) => {
    try {
        const { brand_id } = req.query;
        let rows;
        if (brand_id !== undefined) {
            [rows] = await pool.query(
                'SELECT * FROM sliders WHERE brand_id = ? AND is_active = 1 ORDER BY display_order ASC, id ASC',
                [brand_id]
            );
        } else {
            [rows] = await pool.query(
                'SELECT * FROM sliders WHERE brand_id IS NULL AND is_active = 1 ORDER BY display_order ASC, id ASC'
            );
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sliders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/content/gallery?brand_id=<id>
// Omit brand_id → global / home gallery (brand_id IS NULL)
publicRouter.get('/gallery', async (req, res) => {
    try {
        const { brand_id } = req.query;
        let rows;
        if (brand_id !== undefined) {
            [rows] = await pool.query(
                'SELECT * FROM gallery_images WHERE brand_id = ? AND is_active = 1 ORDER BY display_order ASC, id ASC',
                [brand_id]
            );
        } else {
            [rows] = await pool.query(
                'SELECT * FROM gallery_images WHERE brand_id IS NULL AND is_active = 1 ORDER BY display_order ASC, id ASC'
            );
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// Colors (public read, admin write)
// ---------------------------------------------------------------------------

// GET /api/content/colors
publicRouter.get('/colors', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM colors ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching colors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const colorValidation = [
    body('name').trim().notEmpty().withMessage('Color name is required').isLength({ max: 100 }),
    body('code').trim().notEmpty().withMessage('Color code is required')
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color code must be a valid hex color (e.g. #FF0000)'),
];

// POST /api/content/colors
protectedRouter.post('/colors', colorValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, code } = req.body;
        const [result] = await pool.query(
            'INSERT INTO colors (name, code) VALUES (?, ?)',
            [name, code.toUpperCase()]
        );
        const [[color]] = await pool.query('SELECT * FROM colors WHERE id = ?', [result.insertId]);
        res.status(201).json(color);
    } catch (error) {
        console.error('Error creating color:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/content/colors/:id
protectedRouter.put('/colors/:id', colorValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, code } = req.body;
        const [[existing]] = await pool.query('SELECT id FROM colors WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Color not found' });

        await pool.query(
            'UPDATE colors SET name = ?, code = ? WHERE id = ?',
            [name, code.toUpperCase(), req.params.id]
        );
        const [[updated]] = await pool.query('SELECT * FROM colors WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        console.error('Error updating color:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/content/colors/:id
protectedRouter.delete('/colors/:id', async (req, res) => {
    try {
        const [[existing]] = await pool.query('SELECT id FROM colors WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Color not found' });

        await pool.query('DELETE FROM colors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Color deleted successfully' });
    } catch (error) {
        console.error('Error deleting color:', error);
        // ON DELETE RESTRICT — color is used by a product
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'Cannot delete color while it is assigned to products.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const brandCreateValidation = [
    body('name').trim().notEmpty().withMessage('Brand name is required').isLength({ max: 100 }),
    body('slug').trim().notEmpty().withMessage('Slug is required').isLength({ max: 100 })
        .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens only'),
    body('description').optional().trim().isLength({ max: 5000 }),
];

const brandUpdateValidation = [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('slug').optional().trim().notEmpty().isLength({ max: 100 })
        .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens only'),
    body('description').optional().trim().isLength({ max: 5000 }),
];

const sliderValidation = [
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
];

const galleryValidation = [
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('caption').optional().trim().isLength({ max: 255 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
];

// ---------------------------------------------------------------------------
// Brands CRUD (protected)
// ---------------------------------------------------------------------------

// POST /api/content/brands
protectedRouter.post('/brands', upload.single('logo'), brandCreateValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let filename;
    try {
        let logoUrl = null;
        if (req.file) {
            filename = await processImage(req.file.buffer);
            logoUrl = getImageUrl(filename);
        }

        const { name, slug, description } = req.body;
        const [result] = await pool.query(
            'INSERT INTO brands (name, slug, logo_url, description) VALUES (?, ?, ?, ?)',
            [name, slug, logoUrl, description || null]
        );

        const [[brand]] = await pool.query('SELECT * FROM brands WHERE id = ?', [result.insertId]);
        res.status(201).json(brand);
    } catch (error) {
        console.error('Error creating brand:', error);
        if (filename) await deleteImage(filename);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Brand name or slug already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/content/brands/:id
protectedRouter.put('/brands/:id', upload.single('logo'), brandUpdateValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let newFilename;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM brands WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Brand not found' });
        }

        let logoUrl = existing.logo_url;
        let oldFilename = null;

        if (req.file) {
            newFilename = await processImage(req.file.buffer);
            logoUrl = getImageUrl(newFilename);
            if (existing.logo_url) oldFilename = filenameFromUrl(existing.logo_url);
        }

        const { name, slug, description } = req.body;
        await conn.query(
            'UPDATE brands SET name = ?, slug = ?, logo_url = ?, description = ? WHERE id = ?',
            [
                name !== undefined ? name : existing.name,
                slug !== undefined ? slug : existing.slug,
                logoUrl,
                description !== undefined ? description : existing.description,
                req.params.id,
            ]
        );

        await conn.commit();
        if (oldFilename) await deleteImage(oldFilename);

        const [[updated]] = await pool.query('SELECT * FROM brands WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        await conn.rollback();
        console.error('Error updating brand:', error);
        if (newFilename) await deleteImage(newFilename);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Brand name or slug already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// DELETE /api/content/brands/:id
protectedRouter.delete('/brands/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM brands WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Brand not found' });
        }

        const logoFilename = filenameFromUrl(existing.logo_url);
        await conn.query('DELETE FROM brands WHERE id = ?', [req.params.id]);
        await conn.commit();

        if (logoFilename) await deleteImage(logoFilename);
        res.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error deleting brand:', error);
        // ON DELETE RESTRICT on products.brand_id — must reassign products first
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'Cannot delete brand while it has products. Reassign or delete products first.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// ---------------------------------------------------------------------------
// Sliders CRUD (protected)
// ---------------------------------------------------------------------------

// POST /api/content/sliders
protectedRouter.post('/sliders', upload.single('image'), sliderValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    let filename;
    try {
        filename = await processImage(req.file.buffer);
        const imageUrl = getImageUrl(filename);
        const { brand_id, display_order, is_active } = req.body;

        const [result] = await pool.query(
            'INSERT INTO sliders (brand_id, image_url, display_order, is_active) VALUES (?, ?, ?, ?)',
            [brand_id || null, imageUrl, display_order || 0, is_active !== undefined ? is_active : 1]
        );

        const [[slider]] = await pool.query('SELECT * FROM sliders WHERE id = ?', [result.insertId]);
        res.status(201).json(slider);
    } catch (error) {
        console.error('Error creating slider:', error);
        if (filename) await deleteImage(filename);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/content/sliders/:id
protectedRouter.put('/sliders/:id', upload.single('image'), sliderValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let newFilename;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Slider not found' });
        }

        let imageUrl = existing.image_url;
        let oldFilename = null;

        if (req.file) {
            newFilename = await processImage(req.file.buffer);
            imageUrl = getImageUrl(newFilename);
            oldFilename = filenameFromUrl(existing.image_url);
        }

        const { brand_id, display_order, is_active } = req.body;
        await conn.query(
            'UPDATE sliders SET brand_id = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?',
            [
                brand_id !== undefined ? (brand_id || null) : existing.brand_id,
                imageUrl,
                display_order !== undefined ? display_order : existing.display_order,
                is_active !== undefined ? is_active : existing.is_active,
                req.params.id,
            ]
        );

        await conn.commit();
        if (oldFilename) await deleteImage(oldFilename);

        const [[updated]] = await pool.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        await conn.rollback();
        console.error('Error updating slider:', error);
        if (newFilename) await deleteImage(newFilename);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// DELETE /api/content/sliders/:id
protectedRouter.delete('/sliders/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Slider not found' });
        }

        const filename = filenameFromUrl(existing.image_url);
        await conn.query('DELETE FROM sliders WHERE id = ?', [req.params.id]);
        await conn.commit();

        await deleteImage(filename);
        res.json({ message: 'Slider deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error deleting slider:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// ---------------------------------------------------------------------------
// Gallery CRUD (protected)
// ---------------------------------------------------------------------------

// POST /api/content/gallery
protectedRouter.post('/gallery', upload.single('image'), galleryValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    let filename;
    try {
        filename = await processImage(req.file.buffer);
        const imageUrl = getImageUrl(filename);
        const { brand_id, caption, display_order, is_active } = req.body;

        const [result] = await pool.query(
            'INSERT INTO gallery_images (brand_id, image_url, caption, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [brand_id || null, imageUrl, caption || null, display_order || 0, is_active !== undefined ? is_active : 1]
        );

        const [[image]] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [result.insertId]);
        res.status(201).json(image);
    } catch (error) {
        console.error('Error creating gallery image:', error);
        if (filename) await deleteImage(filename);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/content/gallery/:id
protectedRouter.put('/gallery/:id', upload.single('image'), galleryValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let newFilename;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Gallery image not found' });
        }

        let imageUrl = existing.image_url;
        let oldFilename = null;

        if (req.file) {
            newFilename = await processImage(req.file.buffer);
            imageUrl = getImageUrl(newFilename);
            oldFilename = filenameFromUrl(existing.image_url);
        }

        const { brand_id, caption, display_order, is_active } = req.body;
        await conn.query(
            'UPDATE gallery_images SET brand_id = ?, image_url = ?, caption = ?, display_order = ?, is_active = ? WHERE id = ?',
            [
                brand_id !== undefined ? (brand_id || null) : existing.brand_id,
                imageUrl,
                caption !== undefined ? caption : existing.caption,
                display_order !== undefined ? display_order : existing.display_order,
                is_active !== undefined ? is_active : existing.is_active,
                req.params.id,
            ]
        );

        await conn.commit();
        if (oldFilename) await deleteImage(oldFilename);

        const [[updated]] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        await conn.rollback();
        console.error('Error updating gallery image:', error);
        if (newFilename) await deleteImage(newFilename);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

// DELETE /api/content/gallery/:id
protectedRouter.delete('/gallery/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Gallery image not found' });
        }

        const filename = filenameFromUrl(existing.image_url);
        await conn.query('DELETE FROM gallery_images WHERE id = ?', [req.params.id]);
        await conn.commit();

        await deleteImage(filename);
        res.json({ message: 'Gallery image deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error deleting gallery image:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
});

module.exports = { publicRouter, protectedRouter };
