# ShopPro Portfolio Project

ShopPro is a full-stack product dashboard upgraded for a Frontend Developer portfolio.

## Why this project is CV-ready

- Modern frontend stack: React + TypeScript + Vite
- Session-based auth flow (login/logout/me) integrated with Spring Security
- Real e-commerce flows: product listing, filtering, sorting, cart, checkout, order detail
- API-driven architecture while keeping legacy Thymeleaf pages intact
- Responsive custom UI with reusable layout and protected routes

## Tech Stack

- Backend: Spring Boot 3, Spring Security, Spring Data JPA, Thymeleaf
- Frontend: React 18, TypeScript, React Router, Vite
- Database:
  - Runtime: MySQL (lab08)
  - Test: H2 in-memory

## Project Structure

- `be/src/main/java/...`: Spring Boot backend + REST APIs
- `be/src/main/resources/templates`: Existing Thymeleaf screens (still available)
- `fe/`: New React portfolio frontend

## New REST API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/products`
- `GET /api/categories`
- `GET /api/cart`
- `POST /api/cart/items`
- `PUT /api/cart/items/{productId}`
- `DELETE /api/cart/items/{productId}`
- `POST /api/cart/checkout`
- `GET /api/orders/{id}`
- `POST /api/admin/cloudinary/upload` (upload ảnh lên Cloudinary, optional gắn cho product)

## Cloudinary Image Storage Setup

### 1) Configure credentials

In `be/src/main/resources/application.properties`, set:

```properties
cloudinary.cloud-name=<your-cloud-name>
cloudinary.api-key=<your-api-key>
cloudinary.api-secret=<your-api-secret>
cloudinary.folder=shoppro/products
```

### 2) Login as admin

Cloudinary upload API is under `/api/admin/**`, so you need admin session:

- Username: `admin`
- Password: `admin123`

### 3) Upload image

Using cURL (PowerShell):

```powershell
curl.exe -X POST "http://localhost:8080/api/admin/cloudinary/upload" `
  -b cookies.txt -c cookies.txt `
  -F "file=@D:\path\to\image.jpg"
```

Upload + attach to product:

```powershell
curl.exe -X POST "http://localhost:8080/api/admin/cloudinary/upload" `
  -b cookies.txt -c cookies.txt `
  -F "file=@D:\path\to\image.jpg" `
  -F "productId=1"
```

Response contains `secureUrl` (Cloudinary HTTPS URL).  
If `productId` is provided, backend saves this URL to `product.image` and `product.thumbnail`.

## How to Run

### Quick start scripts (recommended)

```powershell
cd D:\ShopPro
powershell -ExecutionPolicy Bypass -File .\run-be.ps1
```

Open a second terminal:

```powershell
cd D:\ShopPro
powershell -ExecutionPolicy Bypass -File .\run-fe.ps1
```

### Important

- Backend is fixed on port `8080`.
- Frontend proxies to backend port `8080`.

### Manual run

#### 1) Start backend

```powershell
cd D:\ShopPro\be
.\mvnw.cmd spring-boot:run -Dspring-boot.run.arguments=--server.port=8080
```

#### 2) Start frontend

```powershell
cd D:\ShopPro\fe
npm.cmd install
npm.cmd run dev
```

Frontend runs at `http://localhost:5173` (or another free port if 5173 is busy).

### 3) Login accounts

- Admin: `admin` / `admin123`
- User: `user1` / `user123`

## Troubleshooting

- If PowerShell shows `npm.ps1 cannot be loaded`, use `npm.cmd` instead of `npm`.
- If backend fails with `Cannot index into a null array` on `mvnw.cmd`, pull latest code (wrapper script has been patched).
- Backend requires JDK 17+.
- If backend says port 8080 is in use, stop process on 8080 first.
