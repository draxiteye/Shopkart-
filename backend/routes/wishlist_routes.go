package routes

import (
	"shopkart-backend/controllers"
	"shopkart-backend/middleware"

	"github.com/gofiber/fiber/v3"
)

// SetupWishlistRoutes registers all wishlist endpoints
func SetupWishlistRoutes(app *fiber.App) {
	wishlist := app.Group("/wishlist", middleware.AuthMiddleware())

	wishlist.Post("/:productId", controllers.AddToWishlist)
	wishlist.Get("/", controllers.GetWishlist)
	wishlist.Delete("/:productId", controllers.RemoveFromWishlist)
}
