package routes

import (
	"shopkart-backend/controllers"

	"github.com/gofiber/fiber/v3"
)

// SetupProductRoutes registers all product-related endpoints
func SetupProductRoutes(app *fiber.App) {
	products := app.Group("/products")

	// Public routes
	products.Post("/", controllers.CreateProduct)
	products.Get("/", controllers.GetProducts)
	products.Get("/:id", controllers.GetProductByID)
}
