package routes

import (
	"shopkart-backend/controllers"
	"shopkart-backend/middleware"

	"github.com/gofiber/fiber/v3"
)

// SetupOrderRoutes registers all order and checkout endpoints
func SetupOrderRoutes(app *fiber.App) {
	orders := app.Group("/orders", middleware.AuthMiddleware())

	orders.Post("/create-payment-order", controllers.CreatePaymentOrder)
	orders.Post("/verify-payment", controllers.VerifyPayment)
	orders.Get("/", controllers.GetOrders)
	orders.Get("/:id", controllers.GetOrderByID)
}
