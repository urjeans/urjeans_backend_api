-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS urjeansu_urjeans_db;
USE urjeansu_urjeans_db;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(50) NOT NULL,
    style VARCHAR(50) NOT NULL,
    colors VARCHAR(255) NOT NULL,
    images TEXT NOT NULL,
    fabric VARCHAR(255) NOT NULL,
    sizes VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brand_name ON products(brand_name);
CREATE INDEX IF NOT EXISTS idx_product_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_style ON products(style);
CREATE INDEX IF NOT EXISTS idx_created_at ON products(created_at);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin user with proper bcrypt hash for password 'Admin@123'
INSERT IGNORE INTO users (username, password, role) 
VALUES ('admin', '$2b$10$yHKnJPgCvWzQafepOoupLOztl.CWuZrGkwfamVNZlIBY13H1iA6Xe', 'admin');

-- Insert sample products data
INSERT IGNORE INTO products (product_name, brand_name, style, colors, images, fabric, sizes, description) VALUES
('Classic Blue Jeans', 'Izmir', 'Straight Fit', 'Blue,Black', '["url1.jpg","url2.jpg","url3.jpg"]', '98% Cotton, 2% Elastane', '28,30,32,34', 'Classic fit blue jeans with modern styling'),
('Comfort Stretch Jeans', 'Powerful', 'Relaxed Fit', 'Dark Blue,Light Blue', '["url4.jpg","url5.jpg"]', '100% Cotton', '30,32,34,36', 'Comfortable everyday wear jeans'),
('Slim Trendy Jeans', 'Zilver', 'Slim Fit', 'Black,White', '["url6.jpg","url7.jpg","url8.jpg"]', '95% Cotton, 5% Spandex', '28,30,32', 'Slim fit trendy jeans'); 