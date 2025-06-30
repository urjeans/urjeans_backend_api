I'll help you create a SQL script file that you can use to automate database creation on your server. This will make it easier to set up the database anywhere you deploy your project.

Now, let me create a simple shell script that you can use to run this SQL file on any server:

Now you have two files in your `backend/database` directory:
1. `init.sql` - Contains all the SQL commands to create and set up your database
2. `setup.sh` - A shell script to automate the database setup process

To use these files on your server:

1. First, make the setup script executable:
```bash
chmod +x backend/database/setup.sh
```

2. Make sure your `.env` file is properly configured with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=urjeans_db
```

3. Run the setup script:
```bash
cd backend/database
./setup.sh
```

The script will:
- Check if MySQL is installed
- Verify that your `.env` file exists
- Create the database and tables
- Set up the initial admin user
- Insert sample product data

Important notes:
1. The admin user's password in `init.sql` is a placeholder. You should update it in your application using the password change functionality.
2. The script uses `INSERT IGNORE` for sample data, so it won't duplicate entries if you run it multiple times.
3. Make sure to keep your `.env` file secure and never commit it to version control.

Would you like me to explain any part of this setup in more detail?