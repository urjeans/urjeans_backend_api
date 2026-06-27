# Urjeans Backend API — Reference

**Base URL (production):** `https://urjeans.uz`  
**Base URL (local dev):** `http://localhost:3000`

---

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are valid for **24 hours**. They are immediately invalidated on logout or password change.

---

## Error Format

All error responses follow this shape:

```json
{ "error": "Human-readable message" }
```

Validation errors return an array:

```json
{
  "errors": [
    { "field": "brand_id", "msg": "Brand is required" }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Missing, expired, or invalidated token |
| 403 | Valid token but not admin |
| 404 | Resource not found |
| 409 | Conflict (duplicate slug, brand has products, or color is in use) |
| 429 | Rate limit exceeded (login endpoint) |
| 500 | Server error |

---

## Auth

### POST `/api/auth/login`

No authentication required. Rate-limited to **10 requests per 15 minutes**.

**Request body** (`application/json`):

```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**Response 200:**

```json
{
  "user": {
    "id": 1,
    "username": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST `/api/auth/logout`

Requires auth. Immediately invalidates the current token (and all other active tokens for this user).

**Response 200:**

```json
{ "message": "Logged out successfully" }
```

---

### POST `/api/auth/change-password`

Requires auth. Invalidates all existing tokens after success — user must log in again.

**Request body:**

```json
{
  "currentPassword": "Admin@123",
  "newPassword": "NewPass@456"
}
```

Password rules: min 8 chars, at least one uppercase, one lowercase, one number, one special character (`@$!%*?&`).

**Response 200:**

```json
{ "message": "Password updated successfully" }
```

---

### GET `/api/auth/me`

Requires auth. Returns the current user's info.

**Response 200:**

```json
{
  "id": 1,
  "username": "admin",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

## Products

### Product object

```json
{
  "id": 1,
  "product_name": "Classic Blue Jeans",
  "brand_id": 1,
  "brand_name": "Izmir",
  "brand_slug": "izmir",
  "style": "Straight Fit",
  "colors": [
    { "id": 1, "name": "Black", "code": "#000000" },
    { "id": 3, "name": "Navy Blue", "code": "#1C3A5E" }
  ],
  "images": ["/uploads/1234-abc.jpg", "/uploads/5678-def.jpg"],
  "fabric": "98% Cotton, 2% Elastane",
  "sizes": ["28", "30", "32", "34"],
  "description": "Classic fit blue jeans with modern styling",
  "deleted_at": null,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

> `images` contains URL paths. Prepend the base URL to display them:  
> `https://urjeans.uz/uploads/1234-abc.jpg`

> `colors` is always an array of color objects. Use `code` for swatches and `name` for labels.

---

### GET `/api/products`

Returns a paginated list of all active products.

**Query params:**

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `page` | 1 | — | Page number |
| `limit` | 20 | 100 | Items per page |

**Response 200:**

```json
{
  "data": [ /* Product objects */ ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/products/:id`

**Response 200:** Single product object.  
**Response 404:** `{ "error": "Product not found" }`

---

### GET `/api/products/brand/:slug`

Returns all active products for a brand. Use the brand's `slug` (e.g. `izmir`, `powerful`, `zilver`).

**Response 200:** Array of product objects, ordered newest first.

```
GET /api/products/brand/izmir
```

---

### GET `/api/products/style/:style`

Returns all active products matching a style.

```
GET /api/products/style/Slim%20Fit
```

**Response 200:** Array of product objects.

---

### GET `/api/products/search/:query`

Full-text search across `product_name` and `description`. Query is capped at 100 characters.

```
GET /api/products/search/blue
```

**Response 200:** Array of product objects (relevance-ranked by MySQL FULLTEXT).

---

### POST `/api/products` 🔒 Admin

Requires auth + admin role. Use `multipart/form-data` (to support file uploads).

**Form fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product_name` | string | Yes | Max 255 chars |
| `brand_id` | integer | Yes | Must be a valid brand ID |
| `style` | string | No | Max 50 chars |
| `color_ids` | string | Yes | JSON array of color IDs: `[1,3]` or comma-separated: `1,3` |
| `fabric` | string | Yes | Max 255 chars |
| `sizes` | string | Yes | JSON array `["28","30"]` or comma-separated `28,30` |
| `description` | string | No | Max 5000 chars |
| `images` | file(s) | No | Up to 5 images, max 15MB each. JPEG/PNG/WebP accepted. |

**Response 201:** The created product object (with full `colors` array).

**Response 400:** `{ "error": "Invalid brand ID or color ID" }` if either FK doesn't exist.

---

### PUT `/api/products/:id` 🔒 Admin

Update a product. Same fields as POST. All fields are required (it's a full replace, not a patch).

Colors are fully replaced — send the complete new set of `color_ids`.

**Partial image update:**

By default, all existing images are kept and new uploads are appended. To remove specific images, send `existingImages` with only the URLs you want to **keep**:

```
existingImages: ["/uploads/keep-this-one.jpg"]
```

Any existing image not in `existingImages` will be deleted from the server. New uploads are appended after the kept ones.

**Response 200:** The updated product object.

---

### DELETE `/api/products/:id` 🔒 Admin

Soft-deletes the product (sets `deleted_at`, removes from all GET responses) and deletes all its image files from disk.

**Response 200:**

```json
{ "message": "Product deleted successfully" }
```

---

## Content

### Color object

```json
{
  "id": 1,
  "name": "Navy Blue",
  "code": "#1C3A5E",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

### Brand object

```json
{
  "id": 1,
  "name": "Izmir",
  "slug": "izmir",
  "logo_url": "/uploads/1234-abc.jpg",
  "description": "Premium denim since 2010",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

### Slider object

```json
{
  "id": 1,
  "brand_id": null,
  "image_url": "/uploads/5678-def.jpg",
  "display_order": 0,
  "is_active": 1,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

> `brand_id: null` = home page slider.  
> `brand_id: 1` = Izmir brand page slider.

### Gallery image object

```json
{
  "id": 1,
  "brand_id": null,
  "image_url": "/uploads/9012-ghi.jpg",
  "caption": "Spring collection 2026",
  "display_order": 0,
  "is_active": 1,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

---

### GET `/api/content/colors`

Returns all colors ordered alphabetically. Use this to populate the color picker when creating/editing products.

**Response 200:** Array of color objects.

```json
[
  { "id": 1, "name": "Black", "code": "#000000", ... },
  { "id": 5, "name": "Dark Blue", "code": "#00008B", ... }
]
```

---

### POST `/api/content/colors` 🔒 Admin

**Request body** (`application/json`):

```json
{
  "name": "Indigo",
  "code": "#4B0082"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Max 100 chars |
| `code` | Yes | Hex color, e.g. `#4B0082`. Stored in uppercase. |

**Response 201:** Color object.

---

### PUT `/api/content/colors/:id` 🔒 Admin

Both fields required.

**Request body** (`application/json`):

```json
{
  "name": "Indigo",
  "code": "#4B0082"
}
```

**Response 200:** Updated color object.  
**Response 404:** `{ "error": "Color not found" }`

---

### DELETE `/api/content/colors/:id` 🔒 Admin

**Response 200:** `{ "message": "Color deleted successfully" }`  
**Response 409:** `{ "error": "Cannot delete color while it is assigned to products." }`

> A color cannot be deleted while any product uses it. Remove it from all products first.

---

### GET `/api/content/brands`

Returns all brands ordered alphabetically.

**Response 200:** Array of brand objects.

---

### GET `/api/content/brands/:slug`

```
GET /api/content/brands/izmir
```

**Response 200:** Single brand object.  
**Response 404:** `{ "error": "Brand not found" }`

---

### GET `/api/content/sliders`

Returns active sliders ordered by `display_order`.

| Query param | Example | Returns |
|-------------|---------|---------|
| *(omit)* | `/api/content/sliders` | Home page sliders (`brand_id IS NULL`) |
| `brand_id` | `/api/content/sliders?brand_id=1` | Sliders for brand ID 1 |

**Response 200:** Array of slider objects.

---

### GET `/api/content/gallery`

Returns active gallery images ordered by `display_order`.

| Query param | Example | Returns |
|-------------|---------|---------|
| *(omit)* | `/api/content/gallery` | Home gallery (`brand_id IS NULL`) |
| `brand_id` | `/api/content/gallery?brand_id=2` | Gallery for brand ID 2 |

**Response 200:** Array of gallery image objects.

---

### POST `/api/content/brands` 🔒 Admin

Use `multipart/form-data`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Max 100 chars, must be unique |
| `slug` | string | Yes | Max 100 chars, unique, lowercase letters/numbers/hyphens only (`^[a-z0-9-]+$`) |
| `description` | string | No | Max 5000 chars |
| `logo` | file | No | Single image |

**Response 201:** Brand object.  
**Response 409:** `{ "error": "Brand name or slug already exists" }`

---

### PUT `/api/content/brands/:id` 🔒 Admin

All fields optional — only sent fields are updated.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Max 100 chars |
| `slug` | string | Lowercase letters/numbers/hyphens only |
| `description` | string | Max 5000 chars |
| `logo` | file | Replaces existing logo; old file deleted |

**Response 200:** Updated brand object.

---

### DELETE `/api/content/brands/:id` 🔒 Admin

**Response 200:** `{ "message": "Brand deleted successfully" }`  
**Response 409:** Brand still has products — reassign or delete products first.

> Sliders and gallery images for this brand are automatically deleted (cascade).

---

### POST `/api/content/sliders` 🔒 Admin

Use `multipart/form-data`. Image is required.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image` | file | Yes | Single image |
| `brand_id` | integer | No | Omit or send empty for home slider |
| `display_order` | integer | No | Default 0 |
| `is_active` | boolean | No | Default 1 (active) |

**Response 201:** Slider object.

---

### PUT `/api/content/sliders/:id` 🔒 Admin

All fields optional.

| Field | Type | Notes |
|-------|------|-------|
| `image` | file | Replaces existing image |
| `brand_id` | integer | Send empty string to reset to home slider |
| `display_order` | integer | |
| `is_active` | boolean | |

**Response 200:** Updated slider object.

---

### DELETE `/api/content/sliders/:id` 🔒 Admin

Deletes the slider and its image file.

**Response 200:** `{ "message": "Slider deleted successfully" }`

---

### POST `/api/content/gallery` 🔒 Admin

Use `multipart/form-data`. Image is required.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image` | file | Yes | Single image |
| `brand_id` | integer | No | Omit for home gallery |
| `caption` | string | No | Max 255 chars |
| `display_order` | integer | No | Default 0 |
| `is_active` | boolean | No | Default 1 (active) |

**Response 201:** Gallery image object.

---

### PUT `/api/content/gallery/:id` 🔒 Admin

All fields optional.

| Field | Type | Notes |
|-------|------|-------|
| `image` | file | Replaces existing image |
| `brand_id` | integer | Send empty string to reset to home gallery |
| `caption` | string | Max 255 chars |
| `display_order` | integer | |
| `is_active` | boolean | |

**Response 200:** Updated gallery image object.

---

### DELETE `/api/content/gallery/:id` 🔒 Admin

Deletes the gallery image and its file.

**Response 200:** `{ "message": "Gallery image deleted successfully" }`

---

## Static Files

Uploaded images are served directly with no authentication:

```
GET /uploads/<filename>
```

Example: `https://urjeans.uz/uploads/1719000000000-abc123.jpg`

CORS is open (`*`) on the `/uploads` path so images load from any origin.

---

## Quick Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/logout` | ✅ | Logout (invalidate token) |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/auth/me` | ✅ | Current user info |
| GET | `/api/products` | — | List products (paginated) |
| GET | `/api/products/:id` | — | Single product |
| GET | `/api/products/brand/:slug` | — | Products by brand |
| GET | `/api/products/style/:style` | — | Products by style |
| GET | `/api/products/search/:query` | — | Full-text search |
| POST | `/api/products` | 🔒 Admin | Create product |
| PUT | `/api/products/:id` | 🔒 Admin | Update product |
| DELETE | `/api/products/:id` | 🔒 Admin | Soft-delete product |
| GET | `/api/content/colors` | — | List all colors |
| POST | `/api/content/colors` | 🔒 Admin | Create color |
| PUT | `/api/content/colors/:id` | 🔒 Admin | Update color |
| DELETE | `/api/content/colors/:id` | 🔒 Admin | Delete color |
| GET | `/api/content/brands` | — | List all brands |
| GET | `/api/content/brands/:slug` | — | Single brand |
| GET | `/api/content/sliders` | — | Sliders (home or by brand) |
| GET | `/api/content/gallery` | — | Gallery (home or by brand) |
| POST | `/api/content/brands` | 🔒 Admin | Create brand |
| PUT | `/api/content/brands/:id` | 🔒 Admin | Update brand |
| DELETE | `/api/content/brands/:id` | 🔒 Admin | Delete brand |
| POST | `/api/content/sliders` | 🔒 Admin | Add slider |
| PUT | `/api/content/sliders/:id` | 🔒 Admin | Update slider |
| DELETE | `/api/content/sliders/:id` | 🔒 Admin | Delete slider |
| POST | `/api/content/gallery` | 🔒 Admin | Add gallery image |
| PUT | `/api/content/gallery/:id` | 🔒 Admin | Update gallery image |
| DELETE | `/api/content/gallery/:id` | 🔒 Admin | Delete gallery image |
| GET | `/health` | — | Server health check |
