const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Generate secure random filename
const generateSecureFilename = (originalname) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(originalname).toLowerCase();
    return `${timestamp}-${randomString}${extension}`;
};

// Configure storage with memory storage for processing
const storage = multer.memoryStorage();

// File filter with additional security checks
const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed.'), false);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Invalid file extension.'), false);
    }

    // Check for malicious file names
    if (/[<>:"/\\|?*]/.test(file.originalname)) {
        return cb(new Error('Invalid filename.'), false);
    }

    cb(null, true);
};

// Create multer upload instance with enhanced security
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5, // Maximum 5 files
        fieldSize: 1024 * 1024 // 1MB limit for other fields
    }
});

// Process and optimize image
const processImage = async (buffer, filename) => {
    try {
        // Generate secure filename
        const secureFilename = generateSecureFilename(filename);
        const outputPath = path.join(uploadDir, secureFilename);

        // Process image with sharp
        await sharp(buffer)
            .resize(1000, 1000, { // Max dimensions
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ // Convert to JPEG for better compression
                quality: 80,
                progressive: true
            })
            .toFile(outputPath);

        return secureFilename;
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error('Error processing image');
    }
};

// Function to get public URL for an image
const getImageUrl = (filename) => {
    return `/uploads/${filename}`;
};

// Function to delete image file with security check
const deleteImage = (filename) => {
    // Security check: ensure filename doesn't contain directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        throw new Error('Invalid filename');
    }

    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

// Middleware to process uploaded images
const processUploadedImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const processedFiles = [];
        for (const file of req.files) {
            const processedFilename = await processImage(file.buffer, file.originalname);
            processedFiles.push({
                filename: processedFilename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            });
        }
        req.processedFiles = processedFiles;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    upload,
    getImageUrl,
    deleteImage,
    processUploadedImages
}; 