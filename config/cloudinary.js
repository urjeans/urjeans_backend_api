const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'urjeans', // The name of the folder in cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Allowed image formats
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optional: limit image size
    }
});

// Create multer upload instance
const upload = multer({ storage: storage });

module.exports = {
    cloudinary,
    upload
}; 