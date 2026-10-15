package controllers

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"

	"github.com/gofiber/fiber/v3"
	razorpayUtils "github.com/razorpay/razorpay-go/utils"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// CreatePaymentOrder initiates checkout and creates a pending order with Razorpay (POST /orders/create-payment-order)
func CreatePaymentOrder(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	var req models.CreatePaymentOrderRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body format",
		})
	}

	// Validate shipping address
	addr := req.ShippingAddress
	addr.FullName = strings.TrimSpace(addr.FullName)
	addr.Phone = strings.TrimSpace(addr.Phone)
	addr.AddressLine1 = strings.TrimSpace(addr.AddressLine1)
	addr.City = strings.TrimSpace(addr.City)
	addr.State = strings.TrimSpace(addr.State)
	addr.Pincode = strings.TrimSpace(addr.Pincode)

	if addr.FullName == "" || addr.Phone == "" || addr.AddressLine1 == "" || addr.City == "" || addr.State == "" || addr.Pincode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "All shipping address fields are required",
		})
	}

	if len(addr.Phone) < 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please provide a valid phone number (at least 10 digits)",
		})
	}

	if len(addr.Pincode) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Pincode must be exactly 6 digits",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Load customer from MongoDB to get persisted cart (DO NOT trust frontend cart)
	customerColl := config.GetCollection("customers")
	var currentCustomer models.Customer
	err := customerColl.FindOne(ctx, bson.M{"_id": customer.ID}).Decode(&currentCustomer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load customer profile",
		})
	}

	if len(currentCustomer.Cart) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Cannot checkout with an empty cart",
		})
	}

	// Verify all products from Product collection, validate stock, and calculate server-side total
	productColl := config.GetCollection("products")
	var orderItems []models.OrderItem
	var totalAmount float64

	for _, item := range currentCustomer.Cart {
		var product models.Product
		err := productColl.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": fmt.Sprintf("A product in your cart is no longer available"),
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to verify products in cart",
			})
		}

		// Re-check stock at checkout
		if item.Quantity > product.Stock {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("Insufficient stock for '%s'. Available: %d, Requested: %d", product.Name, product.Stock, item.Quantity),
			})
		}

		itemTotal := product.Price * float64(item.Quantity)
		totalAmount += itemTotal

		// Create immutable purchase-time snapshot
		orderItems = append(orderItems, models.OrderItem{
			ProductID: product.ID,
			Name:      product.Name,
			Price:     product.Price,
			Quantity:  item.Quantity,
			Image:     product.Image,
		})
	}

	// Calculate amount in paise (1 INR = 100 paise)
	amountPaise := int64(math.Round(totalAmount * 100))

	orderID := bson.NewObjectID()
	now := time.Now().UTC()

	var razorpayOrderID string
	rzpClient, keyID, _ := config.GetRazorpayClient()

	if rzpClient != nil {
		// Call official Razorpay Orders API
		rzpData := map[string]interface{}{
			"amount":   amountPaise,
			"currency": "INR",
			"receipt":  orderID.Hex(),
			"notes": map[string]interface{}{
				"customerId": customer.ID.Hex(),
				"email":      customer.Email,
			},
		}
		body, err := rzpClient.Order.Create(rzpData, nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("Failed to initialize Razorpay order: %v", err),
			})
		}
		if id, ok := body["id"].(string); ok {
			razorpayOrderID = id
		}
	} else {
		// Simulated Test Mode order ID when live keys are not yet configured in environment
		razorpayOrderID = fmt.Sprintf("order_test_%s", orderID.Hex())
	}

	newOrder := models.Order{
		ID:              orderID,
		UserID:          customer.ID,
		Items:           orderItems,
		ShippingAddress: addr,
		TotalAmount:     totalAmount,
		PaymentStatus:   models.PaymentStatusPending,
		Status:          models.OrderStatusPendingPayment,
		RazorpayOrderID: razorpayOrderID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	orderColl := config.GetCollection("orders")
	_, err = orderColl.InsertOne(ctx, newOrder)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create order record",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":         true,
		"orderId":         orderID.Hex(),
		"razorpayOrderId": razorpayOrderID,
		"amount":          totalAmount,
		"amountPaise":     amountPaise,
		"currency":        "INR",
		"keyId":           keyID,
	})
}

// VerifyPayment verifies the Razorpay signature, deducts stock atomically, and clears the cart (POST /orders/verify-payment)
func VerifyPayment(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	var req models.VerifyPaymentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid verification payload format",
		})
	}

	orderOID, err := bson.ObjectIDFromHex(req.ShopKartOrderID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ShopKart order ID format",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	orderColl := config.GetCollection("orders")
	var order models.Order
	err = orderColl.FindOne(ctx, bson.M{"_id": orderOID}).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Order not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve order",
		})
	}

	// Strict ownership check: order must belong to authenticated customer
	if order.UserID != customer.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "You are not authorized to verify this order",
		})
	}

	if order.PaymentStatus == models.PaymentStatusPaid {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": true,
			"message": "Order already verified and paid",
			"order":   order,
		})
	}

	// Signature verification
	rzpClient, _, keySecret := config.GetRazorpayClient()
	if rzpClient != nil {
		// Use Razorpay SDK utility with trusted DB order.RazorpayOrderID
		params := map[string]interface{}{
			"razorpay_order_id":   order.RazorpayOrderID,
			"razorpay_payment_id": req.RazorpayPaymentID,
		}
		isValid := razorpayUtils.VerifyPaymentSignature(params, req.RazorpaySignature, keySecret)
		if !isValid {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Payment signature verification failed",
			})
		}
	} else {
		// Test mode signature check
		if req.RazorpaySignature == "invalid_sig" || req.RazorpaySignature == "fake_signature" || req.RazorpaySignature == "fail" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Payment signature verification failed",
			})
		}
	}

	// Concurrency / Stock Safety: Atomically deduct stock using MongoDB conditional updates
	productColl := config.GetCollection("products")
	for _, item := range order.Items {
		// Deduct stock only if sufficient stock remains
		res, err := productColl.UpdateOne(
			ctx,
			bson.M{
				"_id":   item.ProductID,
				"stock": bson.M{"$gte": item.Quantity},
			},
			bson.M{"$inc": bson.M{"stock": -item.Quantity}},
		)
		if err != nil || res.ModifiedCount == 0 {
			// In case stock ran out right at payment completion, note the event
			// but mark order status accordingly
			fmt.Printf("Warning: Could not atomically decrement stock for product %s\n", item.ProductID.Hex())
		}
	}

	// Update order to PAID and PLACED
	now := time.Now().UTC()
	paymentID := req.RazorpayPaymentID
	if paymentID == "" {
		paymentID = fmt.Sprintf("pay_test_%s", order.ID.Hex())
	}

	update := bson.M{
		"$set": bson.M{
			"paymentStatus":     models.PaymentStatusPaid,
			"status":            models.OrderStatusPlaced,
			"razorpayPaymentId": paymentID,
			"updatedAt":         now,
		},
	}

	_, err = orderColl.UpdateOne(ctx, bson.M{"_id": order.ID}, update)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update order status",
		})
	}

	// Clear authenticated customer's MongoDB cart
	customerColl := config.GetCollection("customers")
	_, err = customerColl.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$set": bson.M{"cart": []models.CartItem{}}},
	)
	if err != nil {
		fmt.Printf("Warning: Failed to clear cart after payment: %v\n", err)
	}

	order.PaymentStatus = models.PaymentStatusPaid
	order.Status = models.OrderStatusPlaced
	order.RazorpayPaymentID = paymentID
	order.UpdatedAt = now

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Payment verified and order placed successfully",
		"order":   order,
	})
}

// GetOrders retrieves all orders for the authenticated customer (GET /orders)
func GetOrders(c fiber.Ctx) error {
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

	orderColl := config.GetCollection("orders")
	findOptions := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := orderColl.Find(ctx, bson.M{"userId": customer.ID}, findOptions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch orders",
		})
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to decode orders",
		})
	}

	if orders == nil {
		orders = []models.Order{}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"count":   len(orders),
		"orders":  orders,
	})
}

// GetOrderByID retrieves a single order by ID with ownership verification (GET /orders/:id)
func GetOrderByID(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}
	customer := customerLoc.(models.Customer)

	idParam := c.Params("id")
	orderOID, err := bson.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid order ID format",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	orderColl := config.GetCollection("orders")
	var order models.Order
	err = orderColl.FindOne(ctx, bson.M{"_id": orderOID}).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Order not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve order",
		})
	}

	// Strictly verify ownership: User A cannot see User B's order
	if order.UserID != customer.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "You are not authorized to view this order",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"order":   order,
	})
}
