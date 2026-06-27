-- Drop and recreate for a clean slate
DROP DATABASE IF EXISTS urjeans_db;
CREATE DATABASE urjeans_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE urjeans_db;

-- -----------------------------------------------------------------------------
-- brands (must be created first — referenced by products, sliders, gallery_images)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    logo_url    VARCHAR(500),
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- colors  (master list; admin manages these)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colors (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    code       VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    brand_id     INT NOT NULL,
    style        VARCHAR(50) NOT NULL,
    images       JSON NOT NULL,
    fabric       VARCHAR(255) NOT NULL,
    sizes        JSON NOT NULL,
    description  TEXT,
    deleted_at   TIMESTAMP NULL DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- product_colors  (many-to-many: products ↔ colors)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_colors (
    product_id INT NOT NULL,
    color_id   INT NOT NULL,
    PRIMARY KEY (product_id, color_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id)   REFERENCES colors(id)   ON DELETE RESTRICT
);

CREATE INDEX idx_brand_id     ON products(brand_id);
CREATE INDEX idx_product_name ON products(product_name);
CREATE INDEX idx_style        ON products(style);
CREATE INDEX idx_created_at   ON products(created_at);
CREATE FULLTEXT INDEX ft_search ON products(product_name, description);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'user') DEFAULT 'user',
    token_version INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- sliders  (brand_id NULL = home page slider)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sliders (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    brand_id      INT NULL,
    image_url     VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    is_active     TINYINT(1) DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- gallery_images  (brand_id NULL = global / home gallery)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    brand_id      INT NULL,
    image_url     VARCHAR(500) NOT NULL,
    caption       VARCHAR(255),
    display_order INT DEFAULT 0,
    is_active     TINYINT(1) DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX idx_sliders_order ON sliders(is_active, display_order);
CREATE INDEX idx_gallery_order ON gallery_images(is_active, display_order);

-- -----------------------------------------------------------------------------
-- Seed data
-- -----------------------------------------------------------------------------

-- Admin user  (password: Admin@123)
INSERT IGNORE INTO users (username, password, role)
VALUES ('admin', '$2b$10$yHKnJPgCvWzQafepOoupLOztl.CWuZrGkwfamVNZlIBY13H1iA6Xe', 'admin');

-- Brands  (id 1=Izmir, 2=Powerful, 3=Zilver)
INSERT IGNORE INTO brands (name, slug) VALUES
    ('Izmir',    'izmir'),
    ('Powerful', 'powerful'),
    ('Zilwer',   'zilwer');

-- Colors
INSERT IGNORE INTO colors (name, code) VALUES
    ('Black',      '#000000'),
    ('White',      '#FFFFFF'),
    ('Navy Blue',  '#1C3A5E'),
    ('Light Blue', '#ADD8E6'),
    ('Dark Blue',  '#00008B'),
    ('Grey',       '#808080'),
    ('Khaki',      '#C3B091');

-- Sample products (no colors column — colors set via product_colors)
INSERT IGNORE INTO products (product_name, brand_id, style, images, fabric, sizes, description) VALUES
('Classic Blue Jeans',    1, 'Straight Fit', '["url1.jpg","url2.jpg","url3.jpg"]', '98% Cotton, 2% Elastane', '["28","30","32","34"]', 'Classic fit blue jeans with modern styling'),
('Comfort Stretch Jeans', 2, 'Relaxed Fit',  '["url4.jpg","url5.jpg"]',            '100% Cotton',             '["30","32","34","36"]', 'Comfortable everyday wear jeans'),
('Slim Trendy Jeans',     3, 'Slim Fit',     '["url6.jpg","url7.jpg","url8.jpg"]', '95% Cotton, 5% Spandex',  '["28","30","32"]',      'Slim fit trendy jeans');

-- Sample product_colors (product 1: Black+Navy, product 2: Dark Blue+Light Blue, product 3: Black+White)
INSERT IGNORE INTO product_colors (product_id, color_id) VALUES
    (1, 1), (1, 3),
    (2, 5), (2, 4),
    (3, 1), (3, 2);
