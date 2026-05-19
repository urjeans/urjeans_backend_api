# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start with nodemon (auto-reload)
npm start          # Start with node directly

# Production (PM2)
pm2 start ecosystem.config.js --env production
pm2 logs urjeans-backend
pm2 status

# Utilities
node scripts/generateHash.js   # Generate bcrypt hash for a password
node -e "require('./config/database').pool.query('SELECT 1', console.log)"  # Test DB connection
node -e "console.log(require('sharp').versions.sharp)"  # Test Sharp module

# Sharp rebuild (required when deploying to Linux from macOS)
npm rebuild sharp --platform=linux --arch=x64
```

## Architecture

Single-file Express server (`server.js`) wiring together four modules:

- **[config/database.js](config/database.js)** — mysql2 connection pool; exits process on failed connection at startup
- **[config/storage.js](config/storage.js)** — multer (memory storage) + Sharp pipeline: uploads are held in memory, resized to max 1000×1000px, converted to JPEG 80% quality, saved with a crypto-random filename under `uploads/`
- **[middleware/auth.js](middleware/auth.js)** — JWT verification + admin check; admin is determined by `username === 'admin'` (no role column in practice, despite the schema defining one)
- **[routes/auth.js](routes/auth.js)** — login, change-password, /me
- **[routes/products.js](routes/products.js)** — exports two separate routers: `publicRouter` (GET endpoints, no auth) and `protectedRouter` (POST/PUT/DELETE, requires `auth` + `requireAdmin`)

### Route mounting pattern

```js
app.use('/api/products', productsPublicRouter);            // no auth
app.use('/api/products', auth, requireAdmin, productsProtectedRouter); // admin only
```

Both routers are mounted at the same path; Express runs them in order.

### Image lifecycle

Upload → multer memory buffer → `processImage()` (Sharp) → saved as `uploads/<timestamp>-<hex>.jpg` → URL stored as JSON array in `products.images` column → served statically at `/uploads/*` with wildcard CORS.

On product update: new images replace old ones and old files are deleted from disk. On delete: all image files are cleaned up before the DB row is removed.

## Database

MySQL database `urjeans_db`. Key schema notes:

- `products.images` — JSON array of URL strings (e.g. `["/uploads/abc.jpg"]`)
- `products.colors` and `products.sizes` — comma-separated strings
- `users.password` — the actual column name in DB; the schema doc calls it `password_hash` but the auth code reads `user.password`
- Only `admin` username has write access (hardcoded in `requireAdmin`)

## Environment Variables

Copy `.env.example` to `.env`:

```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=...
DB_NAME=urjeans_db
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000
```

JWT tokens expire in 24 hours. `JWT_SECRET` must be set or token signing will throw.

## Deployment

Hosted on aHost (Linux x64). The `sharp` native module must be rebuilt for the target platform before deploying — this is handled by `npm run deploy` or `./deploy.sh`. See [AHOST_DEPLOYMENT.md](AHOST_DEPLOYMENT.md) for the full checklist.

CORS allows `urjeans.uz`, `www.urjeans.uz`, and configurable `FRONTEND_URL`. The `/uploads` route allows all origins for image access.
