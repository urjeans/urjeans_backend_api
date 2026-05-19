-- Migration: Add sliders and gallery_images tables for content management
-- Run: mysql -u <user> -p <database> < database/migration_content_tables.sql

CREATE TABLE IF NOT EXISTS sliders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  subtitle TEXT,
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255),
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sliders_order ON sliders(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_images(is_active, display_order);
