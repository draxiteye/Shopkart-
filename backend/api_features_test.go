package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"
	"shopkart-backend/routes"
	"shopkart-backend/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var testApp *fiber.App

func setupTestApp() *fiber.App {
	_ = godotenv.Load()
	if os.Getenv("DATABASE_NAME") == "" {
		_ = os.Setenv("DATABASE_NAME", "shopkart")
	}
	if os.Getenv("MONGODB_URI") == "" {
		_ = os.Setenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
	}

	config.ConnectDB()

	app := fiber.New()
	routes.SetupCustomerRoutes(app)
	routes.SetupProductRoutes(app)
	routes.SetupWishlistRoutes(app)
	routes.SetupCartRoutes(app)
	routes.SetupOrderRoutes(app)

	return app
}

func createTestCustomer(t *testing.T, email, password string) (models.Customer, string) {
	coll := config.GetCollection("customers")
	hashed, _ := utils.HashPassword(password)
	cust := models.Customer{
		ID:        bson.NewObjectID(),
		FullName:  "Test Customer " + email,
		Email:     email,
		Password:  hashed,
		Phone:     "9876543210",
		Wishlist:  []bson.ObjectID{},
		Cart:      []models.CartItem{},
		CreatedAt: time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.InsertOne(ctx, cust)
	if err != nil {
		t.Fatalf("Failed to create test customer: %v", err)
	}

	token, err := utils.GenerateToken(cust.ID.Hex())
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	return cust, token
}

func createTestProduct(t *testing.T, name string, price float64, stock int) models.Product {
	coll := config.GetCollection("products")
	prod := models.Product{
		ID:          bson.NewObjectID(),
		Name:        name,
		Description: "Test product description",
		Price:       price,
		Category:    "Electronics",
		Image:       "https://example.com/item.jpg",
		Stock:       stock,
		CreatedAt:   time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.InsertOne(ctx, prod)
	if err != nil {
		t.Fatalf("Failed to create test product: %v", err)
	}

	return prod
}

func doRequest(app *fiber.App, method, target string, body []byte, token string) (*http.Response, map[string]interface{}) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}
	req := httptest.NewRequest(method, target, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.AddCookie(&http.Cookie{
			Name:  "shopkart_auth",
			Value: token,
		})
	}

	resp, err := app.Test(req, fiber.TestConfig{Timeout: 5 * time.Second})
	if err != nil {
		return nil, nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	var jsonMap map[string]interface{}
	_ = json.Unmarshal(respBody, &jsonMap)

	return resp, jsonMap
}

func TestFeatures(t *testing.T) {
	app := setupTestApp()

	// Setup users and products
	user1, token1 := createTestCustomer(t, fmt.Sprintf("user1_%d@example.com", time.Now().UnixNano()), "password123")
	user2, token2 := createTestCustomer(t, fmt.Sprintf("user2_%d@example.com", time.Now().UnixNano()), "password123")

	prod1 := createTestProduct(t, "Gaming Mouse Pro", 1499, 10)
	prod2 := createTestProduct(t, "Mechanical Numpad", 999, 5)

	// ==========================================
	// WISHLIST TESTS
	// ==========================================

	// 1. unauthenticated add → 401
	t.Run("1. Wishlist: unauthenticated add returns 401", func(t *testing.T) {
		resp, _ := doRequest(app, "POST", fmt.Sprintf("/wishlist/%s", prod1.ID.Hex()), nil, "")
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", resp.StatusCode)
		}
	})

	// 2. invalid Product ID → 400
	t.Run("2. Wishlist: invalid product ID format returns 400", func(t *testing.T) {
		resp, _ := doRequest(app, "POST", "/wishlist/invalid-hex-id", nil, token1)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", resp.StatusCode)
		}
	})

	// 3. missing Product → 404
	t.Run("3. Wishlist: non-existent product returns 404", func(t *testing.T) {
		fakeID := bson.NewObjectID().Hex()
		resp, _ := doRequest(app, "POST", fmt.Sprintf("/wishlist/%s", fakeID), nil, token1)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected 404, got %d", resp.StatusCode)
		}
	})

	// 4. valid add → success
	t.Run("4. Wishlist: valid add succeeds", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "POST", fmt.Sprintf("/wishlist/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		if jsonMap["success"] != true {
			t.Errorf("Expected success true, got %v", jsonMap)
		}
	})

	// 5. duplicate add → 409
	t.Run("5. Wishlist: duplicate add returns 409", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "POST", fmt.Sprintf("/wishlist/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusConflict {
			t.Errorf("Expected 409, got %d (resp: %v)", resp.StatusCode, jsonMap)
		}
	})

	// 6. get wishlist → only authenticated user's data
	t.Run("6. Wishlist: get wishlist returns only authenticated user's items", func(t *testing.T) {
		// User1 has prod1
		resp1, map1 := doRequest(app, "GET", "/wishlist", nil, token1)
		if resp1.StatusCode != http.StatusOK {
			t.Errorf("User1 expected 200, got %d", resp1.StatusCode)
		}
		items1, _ := map1["wishlist"].([]interface{})
		if len(items1) != 1 {
			t.Errorf("User1 expected 1 item, got %d", len(items1))
		}

		// User2 has 0 items
		resp2, map2 := doRequest(app, "GET", "/wishlist", nil, token2)
		if resp2.StatusCode != http.StatusOK {
			t.Errorf("User2 expected 200, got %d", resp2.StatusCode)
		}
		items2, _ := map2["wishlist"].([]interface{})
		if len(items2) != 0 {
			t.Errorf("User2 expected 0 items, got %d", len(items2))
		}
	})

	// 7. remove → success
	t.Run("7. Wishlist: remove product succeeds", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "DELETE", fmt.Sprintf("/wishlist/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d (resp: %v)", resp.StatusCode, jsonMap)
		}
	})

	// 8. remove missing entry → 404
	t.Run("8. Wishlist: remove missing entry returns 404", func(t *testing.T) {
		resp, _ := doRequest(app, "DELETE", fmt.Sprintf("/wishlist/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected 404, got %d", resp.StatusCode)
		}
	})

	// ==========================================
	// CART TESTS
	// ==========================================

	// 9. unauthenticated cart → 401
	t.Run("9. Cart: unauthenticated access returns 401", func(t *testing.T) {
		resp, _ := doRequest(app, "GET", "/cart", nil, "")
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", resp.StatusCode)
		}
	})

	// 10. add product → quantity 1
	t.Run("10. Cart: add product sets quantity 1", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "POST", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d (resp: %v)", resp.StatusCode, jsonMap)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) != 1 {
			t.Fatalf("Expected 1 cart item, got %d", len(cart))
		}
		item0 := cart[0].(map[string]interface{})
		if item0["quantity"].(float64) != 1 {
			t.Errorf("Expected quantity 1, got %v", item0["quantity"])
		}
	})

	// 11. add same product → quantity 2
	t.Run("11. Cart: add same product increments quantity to 2", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "POST", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) != 1 {
			t.Fatalf("Expected 1 cart item, got %d", len(cart))
		}
		item0 := cart[0].(map[string]interface{})
		if item0["quantity"].(float64) != 2 {
			t.Errorf("Expected quantity 2, got %v", item0["quantity"])
		}
	})

	// 12. get cart → product data resolved
	t.Run("12. Cart: get cart returns resolved product data", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "GET", "/cart", nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) != 1 {
			t.Fatalf("Expected 1 cart item, got %d", len(cart))
		}
		item0 := cart[0].(map[string]interface{})
		prodMap, _ := item0["product"].(map[string]interface{})
		if prodMap["name"] != "Gaming Mouse Pro" {
			t.Errorf("Expected product name 'Gaming Mouse Pro', got %v", prodMap["name"])
		}
		if prodMap["price"].(float64) != 1499 {
			t.Errorf("Expected price 1499, got %v", prodMap["price"])
		}
	})

	// 13. update valid quantity
	t.Run("13. Cart: update valid quantity succeeds", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"quantity": 4})
		resp, jsonMap := doRequest(app, "PATCH", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), body, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		item0 := cart[0].(map[string]interface{})
		if item0["quantity"].(float64) != 4 {
			t.Errorf("Expected quantity 4, got %v", item0["quantity"])
		}
	})

	// 14. quantity < 1 → 400
	t.Run("14. Cart: quantity < 1 returns 400", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"quantity": 0})
		resp, _ := doRequest(app, "PATCH", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), body, token1)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", resp.StatusCode)
		}
	})

	// 15. quantity > stock → 400
	t.Run("15. Cart: quantity > stock (10) returns 400", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"quantity": 999})
		resp, _ := doRequest(app, "PATCH", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), body, token1)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", resp.StatusCode)
		}
	})

	// 16. remove item
	t.Run("16. Cart: remove item succeeds", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "DELETE", fmt.Sprintf("/cart/%s", prod1.ID.Hex()), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) != 0 {
			t.Errorf("Expected 0 cart items, got %d", len(cart))
		}
	})

	// 17. cart persists across fresh request/login
	t.Run("17. Cart: cart persists across fresh request", func(t *testing.T) {
		// Add prod2 to cart
		doRequest(app, "POST", fmt.Sprintf("/cart/%s", prod2.ID.Hex()), nil, token1)

		// Create a fresh token for same user
		freshToken, _ := utils.GenerateToken(user1.ID.Hex())
		resp, jsonMap := doRequest(app, "GET", "/cart", nil, freshToken)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) != 1 {
			t.Fatalf("Expected 1 cart item to persist, got %d", len(cart))
		}
	})

	// ==========================================
	// ORDERS & CHECKOUT TESTS
	// ==========================================

	shippingAddr := map[string]interface{}{
		"fullName":     "Alex Taylor",
		"phone":        "9876543210",
		"addressLine1": "123 Tech Boulevard",
		"city":         "Bangalore",
		"state":        "Karnataka",
		"pincode":      "560001",
	}

	// 18. unauthenticated create → 401
	t.Run("18. Orders: unauthenticated create-payment-order returns 401", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{"shippingAddress": shippingAddr})
		resp, _ := doRequest(app, "POST", "/orders/create-payment-order", body, "")
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", resp.StatusCode)
		}
	})

	// 19. empty cart → 400
	t.Run("19. Orders: checkout with empty cart returns 400", func(t *testing.T) {
		// User 2 has empty cart
		body, _ := json.Marshal(map[string]interface{}{"shippingAddress": shippingAddr})
		resp, _ := doRequest(app, "POST", "/orders/create-payment-order", body, token2)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", resp.StatusCode)
		}
	})

	// 20. deleted/missing Product → reject
	t.Run("20. Orders: missing product in cart rejected", func(t *testing.T) {
		// Manually inject non-existent product into user2 cart
		coll := config.GetCollection("customers")
		fakePID := bson.NewObjectID()
		coll.UpdateOne(context.Background(), bson.M{"_id": user2.ID}, bson.M{"$push": bson.M{"cart": bson.M{"productId": fakePID, "quantity": 1}}})

		body, _ := json.Marshal(map[string]interface{}{"shippingAddress": shippingAddr})
		resp, _ := doRequest(app, "POST", "/orders/create-payment-order", body, token2)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", resp.StatusCode)
		}

		// Clean up user2 cart
		coll.UpdateOne(context.Background(), bson.M{"_id": user2.ID}, bson.M{"$set": bson.M{"cart": []models.CartItem{}}})
	})

	// 21. insufficient stock → reject
	t.Run("21. Orders: insufficient stock at checkout rejected", func(t *testing.T) {
		// Set prod2 stock to 0 in database
		pColl := config.GetCollection("products")
		pColl.UpdateOne(context.Background(), bson.M{"_id": prod2.ID}, bson.M{"$set": bson.M{"stock": 0}})

		body, _ := json.Marshal(map[string]interface{}{"shippingAddress": shippingAddr})
		resp, _ := doRequest(app, "POST", "/orders/create-payment-order", body, token1)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400 for 0 stock, got %d", resp.StatusCode)
		}

		// Restore stock for subsequent tests
		pColl.UpdateOne(context.Background(), bson.M{"_id": prod2.ID}, bson.M{"$set": bson.M{"stock": 10}})
	})

	// 22. client fake total → ignored & 23. valid payment-order creation → pending ShopKart order
	var createdOrderID string
	var createdRazorpayOrderID string

	t.Run("22 & 23. Orders: client fake total ignored and pending order created", func(t *testing.T) {
		// Inject fake client total in request body
		body, _ := json.Marshal(map[string]interface{}{
			"shippingAddress": shippingAddr,
			"totalAmount":     1.0, // FAKE client total
		})

		resp, jsonMap := doRequest(app, "POST", "/orders/create-payment-order", body, token1)
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("Expected 201 Created, got %d (resp: %v)", resp.StatusCode, jsonMap)
		}

		// Check server calculated total correctly (prod2 price is 999 * quantity 1 = 999)
		amount := jsonMap["amount"].(float64)
		if amount != 999 {
			t.Errorf("Server should calculate price as 999, got %v", amount)
		}

		createdOrderID = jsonMap["orderId"].(string)
		createdRazorpayOrderID = jsonMap["razorpayOrderId"].(string)
	})

	// 24. cart remains before verification
	t.Run("24. Orders: cart remains before payment verification", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "GET", "/cart", nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) == 0 {
			t.Errorf("Cart should NOT be cleared before payment verification")
		}
	})

	// 25. fake Razorpay signature → 400
	t.Run("25. Orders: fake Razorpay signature returns 400", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"shopKartOrderId":     createdOrderID,
			"razorpay_order_id":   createdRazorpayOrderID,
			"razorpay_payment_id": "pay_fake_123",
			"razorpay_signature":  "fake_signature",
		})
		resp, _ := doRequest(app, "POST", "/orders/verify-payment", body, token1)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 400 for fake signature, got %d", resp.StatusCode)
		}
	})

	// 26. fake signature does not clear cart
	t.Run("26. Orders: fake signature does not clear cart", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "GET", "/cart", nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		cart, _ := jsonMap["cart"].([]interface{})
		if len(cart) == 0 {
			t.Errorf("Cart must remain intact after failed verification")
		}
	})

	// 27. verified Test Mode payment → PAID/PLACED & 28. verified payment clears backend cart
	t.Run("27 & 28. Orders: verified payment marks order PAID and clears cart", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"shopKartOrderId":     createdOrderID,
			"razorpay_order_id":   createdRazorpayOrderID,
			"razorpay_payment_id": "pay_test_verified_123",
			"razorpay_signature":  "sim_sig_valid",
		})
		resp, jsonMap := doRequest(app, "POST", "/orders/verify-payment", body, token1)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d (resp: %v)", resp.StatusCode, jsonMap)
		}

		orderMap, _ := jsonMap["order"].(map[string]interface{})
		if orderMap["paymentStatus"] != "PAID" {
			t.Errorf("Expected paymentStatus PAID, got %v", orderMap["paymentStatus"])
		}
		if orderMap["status"] != "PLACED" {
			t.Errorf("Expected status PLACED, got %v", orderMap["status"])
		}

		// Verify backend cart was cleared
		respCart, mapCart := doRequest(app, "GET", "/cart", nil, token1)
		if respCart.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", respCart.StatusCode)
		}
		cart, _ := mapCart["cart"].([]interface{})
		if len(cart) != 0 {
			t.Errorf("Expected cart to be 0 after successful payment, got %d", len(cart))
		}
	})

	// 29. GET /orders returns current user's orders
	t.Run("29. Orders: GET /orders returns current user's orders", func(t *testing.T) {
		resp, jsonMap := doRequest(app, "GET", "/orders", nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
		orders, _ := jsonMap["orders"].([]interface{})
		if len(orders) < 1 {
			t.Errorf("Expected at least 1 order for User 1, got %d", len(orders))
		}
	})

	// 30. another user's order cannot be fetched
	t.Run("30. Orders: User 2 cannot fetch User 1's order", func(t *testing.T) {
		resp, _ := doRequest(app, "GET", fmt.Sprintf("/orders/%s", createdOrderID), nil, token2)
		if resp.StatusCode != http.StatusForbidden && resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected 403 or 404 for unauthorized order fetch, got %d", resp.StatusCode)
		}
	})

	// 31. historical order price remains unchanged after Product price change
	t.Run("31. Orders: historical order price remains unchanged after product price change", func(t *testing.T) {
		// Change prod2 price in database from 999 to 2999
		pColl := config.GetCollection("products")
		pColl.UpdateOne(context.Background(), bson.M{"_id": prod2.ID}, bson.M{"$set": bson.M{"price": 2999.0}})

		// Fetch the historical order
		resp, jsonMap := doRequest(app, "GET", fmt.Sprintf("/orders/%s", createdOrderID), nil, token1)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		orderMap, _ := jsonMap["order"].(map[string]interface{})
		items, _ := orderMap["items"].([]interface{})
		item0 := items[0].(map[string]interface{})
		histPrice := item0["price"].(float64)

		if histPrice != 999 {
			t.Errorf("Historical snapshot price should be 999, got %v", histPrice)
		}
		if orderMap["totalAmount"].(float64) != 999 {
			t.Errorf("Order total should remain 999, got %v", orderMap["totalAmount"])
		}
	})
}
