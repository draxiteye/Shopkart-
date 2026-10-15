package controllers

import (
	"context"
	"strings"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"
	"shopkart-backend/utils"

	"github.com/gofiber/fiber/v3"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// Register handles new customer registration (POST /customers/register)
func Register(c fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body format",
		})
	}

	fullName := strings.TrimSpace(req.FullName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := req.Password
	phone := strings.TrimSpace(req.Phone)

	// Validate required fields
	if fullName == "" || email == "" || password == "" || phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "All fields (fullName, email, password, phone) are required",
		})
	}

	// Password length validation
	if len(password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Password must be at least 6 characters long",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("customers")

	// Check if customer with same email already exists
	var existing models.Customer
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "A customer with this email address already exists",
		})
	}

	// Hash password using bcrypt
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Error securing customer password",
		})
	}

	newCustomer := models.Customer{
		ID:        bson.NewObjectID(),
		FullName:  fullName,
		Email:     email,
		Password:  hashedPassword,
		Phone:     phone,
		CreatedAt: time.Now().UTC(),
	}

	_, err = collection.InsertOne(ctx, newCustomer)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) || strings.Contains(err.Error(), "11000") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "A customer with this email address already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create customer account",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":  true,
		"message":  "Customer registered successfully",
		"customer": newCustomer.ToResponse(),
	})
}

// Login handles customer authentication (POST /customers/login)
func Login(c fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body format",
		})
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := req.Password

	if email == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Email and password are required",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("customers")

	var customer models.Customer
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&customer)
	if err != nil {
		// Generic error prevents username harvesting
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid email or password",
		})
	}

	// Compare plaintext password with stored bcrypt hash
	if !utils.ComparePassword(customer.Password, password) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid email or password",
		})
	}

	// Generate signed JWT token
	token, err := utils.GenerateToken(customer.ID.Hex())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate authentication token",
		})
	}

	// Set HttpOnly cookie for security (XSS immune, not accessible via document.cookie)
	cookie := &fiber.Cookie{
		Name:     "shopkart_auth",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HTTPOnly: true,
		Secure:   false, // Local development on HTTP
		SameSite: "Lax",
	}
	c.Cookie(cookie)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":  true,
		"message":  "Login successful",
		"customer": customer.ToResponse(),
	})
}

// GetMe retrieves the currently authenticated customer profile (GET /customers/me)
func GetMe(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}

	customer, ok := customerLoc.(models.Customer)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Unable to process customer profile",
		})
	}

	// Return customer response without password hash
	return c.Status(fiber.StatusOK).JSON(customer.ToResponse())
}

// Logout invalidates the authentication cookie (POST /customers/logout)
func Logout(c fiber.Ctx) error {
	cookie := &fiber.Cookie{
		Name:     "shopkart_auth",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
	}
	c.Cookie(cookie)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Logged out successfully",
	})
}

// ChangePassword allows an authenticated customer to update their password (PATCH /customers/change-password)
func ChangePassword(c fiber.Ctx) error {
	customerLoc := c.Locals("customer")
	if customerLoc == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized access",
		})
	}

	customer := customerLoc.(models.Customer)

	var req struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}

	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if !utils.ComparePassword(customer.Password, req.OldPassword) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Current password is incorrect",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "New password must be at least 6 characters long",
		})
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to encrypt new password",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("customers")
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": customer.ID},
		bson.M{"$set": bson.M{"password": hashedPassword}},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update password",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Password changed successfully",
	})
}
