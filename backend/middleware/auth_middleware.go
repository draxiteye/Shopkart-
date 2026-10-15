package middleware

import (
	"context"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"
	"shopkart-backend/utils"

	"github.com/gofiber/fiber/v3"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// AuthMiddleware verifies the JWT token from the HttpOnly cookie "shopkart_auth"
func AuthMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		cookie := c.Cookies("shopkart_auth")
		if cookie == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Authentication required. No auth cookie provided.",
			})
		}

		customerIDStr, err := utils.ValidateToken(cookie)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired session token.",
			})
		}

		objectID, err := bson.ObjectIDFromHex(customerIDStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Malformed customer identity in token.",
			})
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var customer models.Customer
		collection := config.GetCollection("customers")
		err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&customer)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"success": false,
					"message": "Customer account no longer exists.",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Database error while verifying customer identity.",
			})
		}

		// Store customer object and customer ID in Fiber Locals (analogous to Express req.user)
		c.Locals("customer", customer)
		c.Locals("customerId", customer.ID.Hex())

		return c.Next()
	}
}
