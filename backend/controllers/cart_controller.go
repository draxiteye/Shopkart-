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

// helper to fetch and populate customer's cart items
func getPopulatedCart(ctx context.Context, customerID bson.ObjectID) ([]models.PopulatedCartItem, error) {
	customerColl := config.GetCollection("customers")
	var customer models.Customer
	err := customerColl.FindOne(ctx, bson.M{"_id": customerID}).Decode(&customer)
	if err != nil {
		return nil, err
	}

	if len(customer.Cart) == 0 {
		return []models.PopulatedCartItem{}, nil
	}

	// Collect product IDs
	var productIDs []bson.ObjectID
	for _, item := range customer.Cart {
		productIDs = append(productIDs, item.ProductID)
	}

	productColl := config.GetCollection("products")
	cursor, err := productColl.Find(ctx, bson.M{"_id": bson.M{"$in": productIDs}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}

	productMap := make(map[bson.ObjectID]models.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	var populated []models.PopulatedCartItem
	for _, item := range customer.Cart {
		if prod, exists := productMap[item.ProductID]; exists {
			populated = append(populated, models.PopulatedCartItem{
				Product:  prod,
				Quantity: item.Quantity,
			})
		}
	}

	if populated == nil {
		populated = []models.PopulatedCartItem{}
	}

	return populated, nil
}

// AddToCart adds a product or increments quantity in the authenticated customer's cart (POST /cart/:productId)
func AddToCart(c fiber.Ctx) error {
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

	// 1. Verify product exists and check latest stock
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

	if product.Stock <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Product is out of stock",
		})
	}

	// 2. Fetch customer cart
	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err = customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load customer profile",
		})
	}

	cart := currentCustomer.Cart
	itemIndex := -1
	for i, item := range cart {
		if item.ProductID == productOID {
			itemIndex = i
			break
		}
	}

	if itemIndex == -1 {
		// New item in cart
		cart = append(cart, models.CartItem{
			ProductID: productOID,
			Quantity:  1,
		})
	} else {
		// Existing item, check stock before incrementing
		if cart[itemIndex].Quantity+1 > product.Stock {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Requested quantity exceeds available stock",
			})
		}
		cart[itemIndex].Quantity++
	}

	// 3. Save updated cart
	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$set": bson.M{"cart": cart}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update cart",
		})
	}

	// 4. Return populated cart
	populatedCart, err := getPopulatedCart(ctx, customer.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve updated cart",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Cart updated successfully",
		"cart":    populatedCart,
	})
}

// GetCart retrieves the authenticated customer's resolved shopping cart (GET /cart)
func GetCart(c fiber.Ctx) error {
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

	populatedCart, err := getPopulatedCart(ctx, customer.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve shopping cart",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"cart":    populatedCart,
	})
}

// UpdateCartQuantity modifies the quantity of an item in the cart (PATCH /cart/:productId)
func UpdateCartQuantity(c fiber.Ctx) error {
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

	var req struct {
		Quantity int `json:"quantity"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body format",
		})
	}

	if req.Quantity < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Quantity must be at least 1",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verify product exists and check latest stock
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

	if req.Quantity > product.Stock {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Requested quantity exceeds available stock",
		})
	}

	// Fetch customer cart
	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err = customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load customer profile",
		})
	}

	itemIndex := -1
	for i, item := range currentCustomer.Cart {
		if item.ProductID == productOID {
			itemIndex = i
			break
		}
	}

	if itemIndex == -1 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Product not found in cart",
		})
	}

	currentCustomer.Cart[itemIndex].Quantity = req.Quantity

	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$set": bson.M{"cart": currentCustomer.Cart}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update item quantity",
		})
	}

	populatedCart, err := getPopulatedCart(ctx, customer.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve updated cart",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Cart item quantity updated successfully",
		"cart":    populatedCart,
	})
}

// RemoveFromCart removes an item from the customer's cart (DELETE /cart/:productId)
func RemoveFromCart(c fiber.Ctx) error {
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
	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$pull": bson.M{"cart": bson.M{"productId": productOID}}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to remove item from cart",
		})
	}

	populatedCart, err := getPopulatedCart(ctx, customer.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve updated cart",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Item removed from cart successfully",
		"cart":    populatedCart,
	})
}
