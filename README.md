# ShopKart — Full-Stack E-Commerce Application (Go + Fiber v3 + MongoDB + React)

A full-stack e-commerce web application featuring **Go (Fiber v3)**, the **official MongoDB Go Driver v2**, and **React (Vite)** with **HttpOnly cookie-based JWT authentication**.

---

## 📌 Project Architecture & Tech Stack

### Backend
* **Language & Runtime:** Go 1.26+
* **Framework:** [Fiber v3](https://github.com/gofiber/fiber/v3) (`github.com/gofiber/fiber/v3`)
* **Database Driver:** [Official MongoDB Go Driver v2](https://go.mongodb.org/mongo-driver/v2) (`go.mongodb.org/mongo-driver/v2/mongo`)
* **Password Hashing:** `golang.org/x/crypto/bcrypt`
* **JWT Tokens:** `github.com/golang-jwt/jwt/v5` (HS256 signature verification)
* **Session Storage:** Secure HttpOnly Cookies (`shopkart_auth`, Lax, SameSite)
* **Configuration:** `github.com/joho/godotenv`

### Frontend
* **Core:** React 19 + Vite
* **Routing:** `react-router-dom` v7
* **HTTP Client:** `axios` (configured with `withCredentials: true`)
* **Icons:** `lucide-react`
* **Styling:** Modern responsive CSS with design tokens

### Database
* **Engine:** MongoDB Community Server (running on `mongodb://127.0.0.1:27017`)
* **Database Name:** `shopkart`
* **Collections:** `customers` (unique index on `email`), `products`

---

## 📁 Folder Structure

```text
ShopKart/
├── backend/
│   ├── cmd/
│   │   ├── server/
│   │   │   └── main.go              # Fiber v3 app bootstrap, CORS, and route registration
│   │   └── seed/
│   │       └── main.go              # Database seeder for sample products
│   ├── config/
│   │   └── database.go              # MongoDB v2 connection and unique index setup
│   ├── controllers/
│   │   ├── customer_controller.go   # Register, Login, GetMe, Logout, ChangePassword
│   │   └── product_controller.go    # CreateProduct, GetProducts (search/filter), GetProductByID
│   ├── models/
│   │   ├── customer.go              # Customer document struct & safe DTOs
│   │   └── product.go               # Product document struct & validation rules
│   ├── middleware/
│   │   └── auth_middleware.go       # Fiber JWT cookie verification & c.Locals session injection
│   ├── routes/
│   │   ├── customer_routes.go       # /customers endpoints
│   │   └── product_routes.go        # /products endpoints
│   ├── utils/
│   │   ├── password.go              # bcrypt hashing and comparison
│   │   └── jwt.go                   # JWT signing and strict HS256 validation
│   ├── test_api.ps1                 # Automated backend test suite
│   ├── .env                         # Backend environment configuration
│   ├── .env.example                 # Example backend environment template
│   ├── go.mod                       # Go module definition
│   └── go.sum                       # Go checksum file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Global responsive navigation bar
│   │   │   ├── ProtectedRoute.jsx   # /customers/me verified route guard
│   │   │   ├── ProductCard.jsx      # Dynamic product card
│   │   │   └── SearchBar.jsx        # Search input with debounce/clear
│   │   ├── pages/
│   │   │   ├── Register.jsx         # Controlled customer registration form
│   │   │   ├── Login.jsx            # Controlled customer login form
│   │   │   ├── Home.jsx             # Protected customer dashboard
│   │   │   ├── Products.jsx         # Catalogue with search, category filtering & sorting
│   │   │   └── ProductDetails.jsx   # Single product view with UI Add to Cart
│   │   ├── services/
│   │   │   └── api.js               # Axios client instance with withCredentials: true
│   │   ├── App.jsx                  # Main application router
│   │   ├── main.jsx                 # React root renderer
│   │   └── index.css                # Global design system & theme variables
│   ├── index.html                   # HTML entrypoint
│   ├── vite.config.js               # Vite configuration
│   ├── .env                         # Frontend environment configuration
│   ├── .env.example                 # Example frontend environment template
│   └── package.json                 # Frontend dependencies and scripts
│
├── .gitignore                       # Git ignore rules
└── README.md                        # Project documentation
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017
DATABASE_NAME=shopkart
JWT_SECRET=shopkart_super_secret_jwt_key_2026_secure
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8080
```

---

## 🚀 Quickstart Guide

### 1. Database
Ensure MongoDB Community Server is active on port `27017`.

### 2. Backend Setup & Run
```bash
cd backend
go mod tidy
go run ./cmd/server
```
*(Optional: Run `go run ./cmd/seed` to populate sample products).*

The backend API will run on `http://localhost:8080`.

### 3. Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev
```

The frontend client will run on `http://localhost:5173`.

---

## 🌐 API Reference

### Customer & Authentication Endpoints

| Method | Endpoint | Access | Description | Request Body | Response (Success) |
|---|---|---|---|---|---|
| `POST` | `/customers/register` | Public | Register new customer | `{ fullName, email, password, phone }` | `201 Created` with customer data (password hash omitted) |
| `POST` | `/customers/login` | Public | Authenticate & set cookie | `{ email, password }` | `200 OK` (Sets `shopkart_auth` HttpOnly cookie) |
| `GET` | `/customers/me` | Protected | Get current customer profile | None | `200 OK` with customer profile |
| `POST` | `/customers/logout` | Protected | Invalidate session cookie | None | `200 OK` (Clears `shopkart_auth` cookie) |
| `PATCH` | `/customers/change-password`| Protected | Update account password | `{ oldPassword, newPassword }` | `200 OK` |

### Product Endpoints

| Method | Endpoint | Access | Description | Query Parameters | Response |
|---|---|---|---|---|---|
| `POST` | `/products` | Public | Create new product | None | `201 Created` |
| `GET` | `/products` | Public | List products | `search`, `category`, `sort` | `200 OK` (`{ success, count, products }`) |
| `GET` | `/products/:id` | Public | Get single product | None | `200 OK` (`{ success, product }`) |

---

## 🔐 Authentication Architecture & Security Details

```
+------------------+         POST /customers/login         +-------------------+
|  React Frontend  | ------------------------------------> | Go / Fiber Backend|
| (Axios Client)   |                                       |                   |
|                  | <------------------------------------ | 1. Find Customer  |
|                  |       Set-Cookie: shopkart_auth=JWT   | 2. bcrypt.Compare |
|                  |       (HttpOnly; SameSite=Lax)        | 3. jwt.Sign       |
+------------------+                                       +-------------------+
        |
        | GET /customers/me (Cookie automatically attached by browser)
        v
+------------------------------------------------------------------------------+
| Fiber AuthMiddleware:                                                        |
|  1. Read `c.Cookies("shopkart_auth")`                                        |
|  2. Parse & strictly verify HS256 signature + expiration via `jwt/v5`        |
|  3. Extract Subject (MongoDB ObjectID hex string)                            |
|  4. Lookup customer in MongoDB                                               |
|  5. Inject into Fiber Locals: `c.Locals("customer", customer)`               |
|  6. Call `c.Next()` -> Handler executes safely                               |
+------------------------------------------------------------------------------+
```

### Why HttpOnly Cookies?
1. **XSS Immunity:** JavaScript cannot read `document.cookie` when `HttpOnly=true`, preventing token theft via malicious scripts.
2. **No Storage Vulnerabilities:** Eliminates insecure storage in `localStorage` or `sessionStorage`.
3. **Automatic Transmission:** The browser handles attaching cookies automatically with `withCredentials: true` in CORS requests.

---

## 🧪 Testing

### Automated Backend Tests
Run the PowerShell automated test suite:
```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\test_api.ps1
```

All 22 test assertions check:
* Health checks
* Required field validations (400)
* Password length validation (400)
* Unique email constraint & duplicate key handling (409)
* Generic login error handling (401)
* HttpOnly cookie emission
* Protected route access control (401 on missing/invalid token)
* Product CRUD and filtering (`search`, `category`, combined, `sort`)
* Invalid ObjectID format handling (400) and 404 for missing records.

---

## 🎓 Viva & Core Concepts Checklist

1. **Fiber Middleware & `c.Next()`:** Middleware intercepts incoming HTTP requests before they reach the controller. Calling `c.Next()` passes control to the next handler in the execution chain.
2. **Fiber Locals:** Contextual key-value store (`c.Locals("key", value)`) scoped to the lifetime of a single request, serving as Go's counterpart to Express `req.user`.
3. **Password Security:** Passwords are never stored in plaintext or MD5/SHA256. `bcrypt` adds random salt and adaptive computational cost to resist brute-force attacks.
4. **JWT Claims:** Contains minimal identity data (`sub` = customer ObjectID, `iat`, `exp`). Secret keys and sensitive attributes are never embedded inside JWT payloads.
5. **MongoDB Go Driver v2:** Uses `mongo.Connect`, `bson.M`, `bson.D`, and `bson.ObjectIDFromHex` for type-safe database interaction.
