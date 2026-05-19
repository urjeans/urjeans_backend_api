const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { upload, getImageUrl, deleteImage, processImage } = require('../config/storage');

const publicRouter = express.Router();
const protectedRouter = express.Router();

const filenameFromUrl = (url) => url.split('/').pop();

// ---------------------------------------------------------------------------
// Public endpoints — frontend reads these
// ---------------------------------------------------------------------------

// GET /api/content/sliders
publicRouter.get('/sliders', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM sliders WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sliders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/content/gallery
publicRouter.get('/gallery', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM gallery_images WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// Protected endpoints — admin panel
// ---------------------------------------------------------------------------

const sliderValidation = [
    body('title').optional().trim().isLength({ max: 255 }),
    body('subtitle').optional().trim().isLength({ max: 1000 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
];

const galleryValidation = [
    body('caption').optional().trim().isLength({ max: 255 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
];

// POST /api/content/sliders
protectedRouter.post('/sliders', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }

    let filename;
    try {
        filename = await processImage(req.file.buffer, req.file.originalname);
        const imageUrl = getImageUrl(filename);
        const { title, subtitle, display_order, is_active } = req.body;

        const [result] = await pool.query(
            'INSERT INTO sliders (title, subtitle, image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [title || null, subtitle || null, imageUrl, display_order || 0, is_active !== undefined ? is_active : 1]
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
    try {
        const [[existing]] = await pool.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Slider not found' });

        let imageUrl = existing.image_url;

        if (req.file) {
            newFilename = await processImage(req.file.buffer, req.file.originalname);
            await deleteImage(filenameFromUrl(existing.image_url));
            imageUrl = getImageUrl(newFilename);
        }

        const { title, subtitle, display_order, is_active } = req.body;
        await pool.query(
            'UPDATE sliders SET title = ?, subtitle = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?',
            [
                title !== undefined ? title : existing.title,
                subtitle !== undefined ? subtitle : existing.subtitle,
                imageUrl,
                display_order !== undefined ? display_order : existing.display_order,
                is_active !== undefined ? is_active : existing.is_active,
                req.params.id,
            ]
        );

        const [[updated]] = await pool.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        console.error('Error updating slider:', error);
        if (newFilename) await deleteImage(newFilename);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/content/sliders/:id
protectedRouter.delete('/sliders/:id', async (req, res) => {
    try {
        const [[existing]] = await pool.query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Slider not found' });

        await deleteImage(filenameFromUrl(existing.image_url));
        await pool.query('DELETE FROM sliders WHERE id = ?', [req.params.id]);
        res.json({ message: 'Slider deleted successfully' });
    } catch (error) {
        console.error('Error deleting slider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/content/gallery
protectedRouter.post('/gallery', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }

    let filename;
    try {
        filename = await processImage(req.file.buffer, req.file.originalname);
        const imageUrl = getImageUrl(filename);
        const { caption, display_order, is_active } = req.body;

        const [result] = await pool.query(
            'INSERT INTO gallery_images (image_url, caption, display_order, is_active) VALUES (?, ?, ?, ?)',
            [imageUrl, caption || null, display_order || 0, is_active !== undefined ? is_active : 1]
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
    try {
        const [[existing]] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Gallery image not found' });

        let imageUrl = existing.image_url;

        if (req.file) {
            newFilename = await processImage(req.file.buffer, req.file.originalname);
            await deleteImage(filenameFromUrl(existing.image_url));
            imageUrl = getImageUrl(newFilename);
        }

        const { caption, display_order, is_active } = req.body;
        await pool.query(
            'UPDATE gallery_images SET image_url = ?, caption = ?, display_order = ?, is_active = ? WHERE id = ?',
            [
                imageUrl,
                caption !== undefined ? caption : existing.caption,
                display_order !== undefined ? display_order : existing.display_order,
                is_active !== undefined ? is_active : existing.is_active,
                req.params.id,
            ]
        );

        const [[updated]] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        console.error('Error updating gallery image:', error);
        if (newFilename) await deleteImage(newFilename);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/content/gallery/:id
protectedRouter.delete('/gallery/:id', async (req, res) => {
    try {
        const [[existing]] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Gallery image not found' });

        await deleteImage(filenameFromUrl(existing.image_url));
        await pool.query('DELETE FROM gallery_images WHERE id = ?', [req.params.id]);
        res.json({ message: 'Gallery image deleted successfully' });
    } catch (error) {
        console.error('Error deleting gallery image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { publicRouter, protectedRouter };
