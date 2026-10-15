package routes

import (
	"shopkart-backend/controllers"
	"shopkart-backend/middleware"

	"github.com/gofiber/fiber/v3"
)

// SetupCartRoutes registers all shopping cart endpoints
func SetupCartRoutes(app *fiber.App) {
	cart := app.Group("/cart", middleware.AuthMiddleware())

	cart.Post("/:productId", controllers.AddToCart)
	cart.Get("/", controllers.GetCart)
	cart.Patch("/:productId", controllers.UpdateCartQuantity)
	cart.Delete("/:productId", controllers.RemoveFromCart)
}
