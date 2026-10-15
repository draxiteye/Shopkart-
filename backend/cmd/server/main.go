package main

import (
	"fmt"
	"log"
	"os"

	"shopkart-backend/config"
	"shopkart-backend/routes"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found or could not be loaded, using process environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	// Connect to MongoDB
	config.ConnectDB()

	// Initialize Fiber application
	app := fiber.New(fiber.Config{
		AppName: "ShopKart API v1.0 (Go/Fiber)",
	})

	// Global Middlewares
	app.Use(logger.New())
	app.Use(recover.New())

	// Configure CORS with credentials enabled for HttpOnly cookies
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL, "http://localhost:5173", "http://127.0.0.1:5173"},
		AllowCredentials: true,
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowMethods:     []string{"GET", "POST", "HEAD", "PUT", "DELETE", "PATCH", "OPTIONS"},
	}))

	// Health check root endpoint
	app.Get("/", func(c fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": true,
			"message": "Welcome to ShopKart API (Go/Fiber Edition)",
			"version": "1.0.0",
		})
	})

	// Setup API routes
	routes.SetupCustomerRoutes(app)
	routes.SetupProductRoutes(app)
	routes.SetupWishlistRoutes(app)
	routes.SetupCartRoutes(app)
	routes.SetupOrderRoutes(app)

	// Start HTTP Server
	addr := fmt.Sprintf(":%s", port)
	fmt.Printf(" ShopKart Backend listening on http://localhost%s\n", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
