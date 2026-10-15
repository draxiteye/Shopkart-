# ShopKart

ShopKart is a full-stack e-commerce application built with **React, Go, Fiber, and MongoDB**.

## Features

- User registration and login
- JWT authentication
- Product browsing, search, and filtering
- Wishlist
- Shopping cart
- Quantity and stock validation
- Checkout
- Razorpay Test Mode integration
- Order history
- Protected APIs

## Tech Stack

- React + Vite
- Go + Fiber
- MongoDB
- Axios
- JWT
- bcrypt

## Run Locally

### Backend

```bash
cd backend
go run ./cmd/server
```

Runs on:

```text
http://localhost:8080
```

### Frontend

```bash
cd frontend
npm run dev
```

Runs on:

```text
http://localhost:5173
```

## Main Flow

```text
Login → Products → Wishlist → Cart → Checkout → Payment → Orders
```

## Note

Use Razorpay **Test Mode** credentials for payment testing.
