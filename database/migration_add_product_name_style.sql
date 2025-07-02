-- Migration script to add product_name and style columns to existing products table
-- Run this script if you have an existing database with products table

USE urjeansu_urjeans_db;

-- Add product_name column
ALTER TABLE products ADD COLUMN product_name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Product' AFTER id;

-- Add style column
ALTER TABLE products ADD COLUMN style VARCHAR(50) NOT NULL DEFAULT 'Classic' AFTER brand_name;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_product_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_style ON products(style);

-- Update existing products with default values
UPDATE products SET 
    product_name = CONCAT(brand_name, ' Jeans') 
WHERE product_name = 'Unnamed Product';

UPDATE products SET 
    style = 'Classic Fit' 
WHERE style = 'Classic';

-- Show the updated table structure
DESCRIBE products; 