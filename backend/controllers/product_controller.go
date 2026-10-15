package controllers

import (
	"context"
	"regexp"
	"strings"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"

	"github.com/gofiber/fiber/v3"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// CreateProduct creates a new product (POST /products)
func CreateProduct(c fiber.Ctx) error {
	var req models.CreateProductRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid product payload format",
		})
	}

	name := strings.TrimSpace(req.Name)
	description := strings.TrimSpace(req.Description)
	category := strings.TrimSpace(req.Category)
	image := strings.TrimSpace(req.Image)

	if name == "" || description == "" || category == "" || image == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Name, description, category, and image are required fields",
		})
	}

	if req.Price <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Product price must be greater than 0",
		})
	}

	if req.Stock == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Product stock quantity is required",
		})
	}

	if *req.Stock < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Product stock quantity cannot be negative",
		})
	}

	newProduct := models.Product{
		ID:          bson.NewObjectID(),
		Name:        name,
		Description: description,
		Price:       req.Price,
		Category:    category,
		Image:       image,
		Stock:       *req.Stock,
		CreatedAt:   time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("products")
	_, err := collection.InsertOne(ctx, newProduct)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create product in database",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Product created successfully",
		"product": newProduct,
	})
}

// GetProducts retrieves products with optional search, category filter, and sorting (GET /products)
func GetProducts(c fiber.Ctx) error {
	searchQuery := strings.TrimSpace(c.Query("search"))
	categoryQuery := strings.TrimSpace(c.Query("category"))
	sortQuery := strings.TrimSpace(c.Query("sort"))

	filter := bson.M{}

	// Safely quote search regex to avoid regex injection
	if searchQuery != "" {
		escapedSearch := regexp.QuoteMeta(searchQuery)
		filter["name"] = bson.M{
			"$regex":   escapedSearch,
			"$options": "i", // case-insensitive
		}
	}

	if categoryQuery != "" && strings.ToLower(categoryQuery) != "all" && strings.ToLower(categoryQuery) != "all categories" {
		filter["category"] = bson.M{
			"$regex":   "^" + regexp.QuoteMeta(categoryQuery) + "$",
			"$options": "i",
		}
	}

	findOptions := options.Find()

	// Handle optional sorting
	switch sortQuery {
	case "price_asc":
		findOptions.SetSort(bson.D{{Key: "price", Value: 1}})
	case "price_desc":
		findOptions.SetSort(bson.D{{Key: "price", Value: -1}})
	default:
		findOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("products")
	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch products from database",
		})
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to parse product documents",
		})
	}

	if products == nil {
		products = []models.Product{}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":  true,
		"count":    len(products),
		"products": products,
	})
}

// GetProductByID retrieves a single product by its MongoDB ObjectID (GET /products/:id)
func GetProductByID(c fiber.Ctx) error {
	idParam := c.Params("id")

	objectID, err := bson.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid product ID format",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := config.GetCollection("products")

	var product models.Product
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Product not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve product details",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"product": product,
	})
}
