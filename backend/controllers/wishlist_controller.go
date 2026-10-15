package controllers

import (
	"context"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"

	"github.com/gofiber/fiber/v3"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// AddToWishlist adds a product to the authenticated customer's wishlist (POST /wishlist/:productId)
func AddToWishlist(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	productIDParam := c.Params("productId")
	productOID, err := bson.ObjectIDFromHex(productIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid product ID format",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verify product exists
	productColl := config.GetCollection("products")
	var product models.Product
	err = productColl.FindOne(ctx, bson.M{"_id": productOID}).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Product not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to verify product",
		})
	}

	// Fetch current customer state to check for duplicate
	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err = customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load customer profile",
		})
	}

	// Check if already in wishlist
	for _, id := range currentCustomer.Wishlist {
		if id == productOID {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "Product is already in your wishlist",
			})
		}
	}

	// Add to wishlist using $addToSet
	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$addToSet": bson.M{"wishlist": productOID}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to add product to wishlist",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Product added to wishlist successfully",
	})
}

// GetWishlist retrieves the authenticated customer's populated wishlist (GET /wishlist)
func GetWishlist(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err := customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve customer wishlist",
		})
	}

	if len(currentCustomer.Wishlist) == 0 {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success":  true,
			"count":    0,
			"wishlist": []models.Product{},
		})
	}

	// Query product collection using $in (Mongoose populate equivalent)
	productColl := config.GetCollection("products")
	cursor, err := productColl.Find(ctx, bson.M{"_id": bson.M{"$in": currentCustomer.Wishlist}})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch wishlist products",
		})
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to decode wishlist products",
		})
	}

	if products == nil {
		products = []models.Product{}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":  true,
		"count":    len(products),
		"wishlist": products,
	})
}

// RemoveFromWishlist removes a product from the authenticated customer's wishlist (DELETE /wishlist/:productId)
func RemoveFromWishlist(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	productIDParam := c.Params("productId")
	productOID, err := bson.ObjectIDFromHex(productIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid product ID format",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err = customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load customer profile",
		})
	}

	// Confirm product is in wishlist
	found := false
	for _, id := range currentCustomer.Wishlist {
		if id == productOID {
			found = true
			break
		}
	}

	if !found {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Product is not in your wishlist",
		})
	}

	// Remove from wishlist with $pull
	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$pull": bson.M{"wishlist": productOID}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to remove product from wishlist",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Product removed from wishlist successfully",
	})
}
