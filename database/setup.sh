#!/bin/bash

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL is not installed. Please install MySQL first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ../.env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your database credentials:"
    echo "DB_HOST=localhost"
    echo "DB_USER=your_username"
    echo "DB_PASSWORD=your_password"
    echo "DB_NAME=urjeans_db"
    exit 1
fi

# Load environment variables
source ../.env

# Run the SQL script
echo "Setting up database..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < init.sql

if [ $? -eq 0 ]; then
    echo "Database setup completed successfully!"
else
    echo "Error: Database setup failed!"
    exit 1
fi 