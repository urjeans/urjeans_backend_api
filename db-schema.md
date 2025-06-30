# Urjeans Database Schema

## Overview
Database schema for the Urjeans website, including products and admin user management.

## Database Initialization
```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS urjeans_db;
USE urjeans_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('admin') NOT NULL DEFAULT 'admin',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brand_name VARCHAR(50) NOT NULL,
    colors VARCHAR(255) NOT NULL,     -- Stored as comma-separated values
    images TEXT NOT NULL,             -- Stored as JSON array of image URLs
    fabric VARCHAR(255) NOT NULL,
    sizes VARCHAR(100) NOT NULL,      -- Stored as comma-separated values
    description TEXT,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,      -- 'create', 'update', 'delete'
    table_name VARCHAR(50) NOT NULL,  -- 'products', 'users'
    record_id INT NOT NULL,           -- ID of the affected record
    old_values JSON,                  -- Previous values
    new_values JSON,                  -- New values
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert initial admin user (password will be hashed in the application)
-- Default password: Admin@123 (should be changed after first login)
-- INSERT INTO users (username, password_hash, email, role) VALUES
-- ('admin', '$2b$10$YourHashedPasswordHere', 'admin@urjeans.com', 'admin');

INSERT INTO users (username, password_hash, email, role) VALUES
('admin', '$2b$10$0GjR3NDNqXLXFY0r0mdtX.aWGmSuS9igcBu2TkAC.OyrHTNPKrRia', 'admin@urjeans.com', 'admin');

-- Insert initial sample data
INSERT INTO products (brand_name, colors, images, fabric, sizes, description, created_by) VALUES
('Izmir', 'Blue,Black', '["url1.jpg","url2.jpg","url3.jpg"]', '98% Cotton, 2% Elastane', '28,30,32,34', 'Classic fit blue jeans with modern styling', 1),
('Powerful', 'Dark Blue,Light Blue', '["url4.jpg","url5.jpg"]', '100% Cotton', '30,32,34,36', 'Comfortable everyday wear jeans', 1),
('Zilver', 'Black,White', '["url6.jpg","url7.jpg","url8.jpg"]', '95% Cotton, 5% Spandex', '28,30,32', 'Slim fit trendy jeans', 1);

-- Create indexes for better query performance
CREATE INDEX idx_brand_name ON products(brand_name);
CREATE INDEX idx_created_at ON products(created_at);
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
```

## Database Connection Configuration
```javascript
// Example database configuration (save as config/database.js)
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'urjeans_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;
```

## Notes
1. Users table includes:
   - Unique username and email
   - Hashed password storage
   - Role-based access (currently only admin)
   - Login tracking
   - Timestamps for auditing

2. Products table updates:
   - Added created_by and updated_by foreign keys
   - Links products to users who create/update them

3. New audit_logs table:
   - Tracks all changes to products and users
   - Stores old and new values
   - Links changes to users
   - Helps with accountability and debugging

4. Security features:
   - Passwords are never stored in plain text
   - All tables have proper foreign key constraints
   - Indexes for better performance
   - Audit logging for all changes

5. Database initialization:
   - Creates all necessary tables
   - Sets up initial admin user
   - Adds sample product data
   - Creates required indexes

## How to Initialize the Database
1. Make sure MySQL is installed and running
2. Update the database configuration with your credentials
3. Run the initialization SQL script:
```bash
mysql -u your_username -p < init.sql
```
Or you can copy and paste the SQL commands into your MySQL client.
