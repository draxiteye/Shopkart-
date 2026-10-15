package routes

import (
	"shopkart-backend/controllers"
	"shopkart-backend/middleware"

	"github.com/gofiber/fiber/v3"
)

// SetupCustomerRoutes registers all customer-related endpoints
func SetupCustomerRoutes(app *fiber.App) {
	customers := app.Group("/customers")

	// Public routes
	customers.Post("/register", controllers.Register)
	customers.Post("/login", controllers.Login)

	// Protected routes requiring AuthMiddleware
	customers.Get("/me", middleware.AuthMiddleware(), controllers.GetMe)
	customers.Post("/logout", middleware.AuthMiddleware(), controllers.Logout)
	customers.Patch("/change-password", middleware.AuthMiddleware(), controllers.ChangePassword)
}
