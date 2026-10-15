package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"shopkart-backend/config"
	"shopkart-backend/models"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func main() {
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	db := config.ConnectDB()
	collection := db.Collection("products")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Clear existing products to ensure clean seed
	_, _ = collection.DeleteMany(ctx, bson.M{})

	seedProducts := []models.Product{
		{
			ID:          bson.NewObjectID(),
			Name:        "Mechanical Gaming Keyboard RGB",
			Description: "High-precision mechanical keyboard with blue switches, durable aluminum top plate, and customizable per-key RGB backlighting.",
			Price:       2999,
			Category:    "Electronics",
			Image:       "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
			Stock:       18,
			CreatedAt:   time.Now().UTC(),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Wireless Noise Canceling Headphones",
			Description: "Premium over-ear wireless headphones featuring active noise cancellation, 40-hour battery life, and crystal-clear acoustic drivers.",
			Price:       4999,
			Category:    "Electronics",
			Image:       "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
			Stock:       25,
			CreatedAt:   time.Now().UTC().Add(1 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Ultra HD 4K Action Camera",
			Description: "Waterproof sports action camera with 4K 60fps recording, dual screens, image stabilization, and included accessory pack.",
			Price:       7499,
			Category:    "Electronics",
			Image:       "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80",
			Stock:       12,
			CreatedAt:   time.Now().UTC().Add(2 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Classic Denim Jacket",
			Description: "Timeless vintage wash denim jacket made with 100% organic cotton, button closure, and tailored modern fit.",
			Price:       1899,
			Category:    "Fashion",
			Image:       "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80",
			Stock:       30,
			CreatedAt:   time.Now().UTC().Add(3 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Minimalist Leather Sneaker",
			Description: "Handcrafted white leather sneakers with cushioned insoles, rubber outsoles, and clean everyday aesthetic.",
			Price:       2499,
			Category:    "Fashion",
			Image:       "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
			Stock:       14,
			CreatedAt:   time.Now().UTC().Add(4 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Clean Code by Robert C. Martin",
			Description: "A handbook of agile software craftsmanship for building clean, maintainable, and robust enterprise applications.",
			Price:       899,
			Category:    "Books",
			Image:       "https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80",
			Stock:       45,
			CreatedAt:   time.Now().UTC().Add(5 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Designing Data-Intensive Applications",
			Description: "The definitive guide to understanding architectures, distributed systems, replication, and data processing.",
			Price:       1299,
			Category:    "Books",
			Image:       "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
			Stock:       22,
			CreatedAt:   time.Now().UTC().Add(6 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Smart Ceramic Coffee Mug Warmer",
			Description: "Temperature-controlled desktop mug with wireless charging base, auto shut-off, and preset heat settings.",
			Price:       1599,
			Category:    "Home",
			Image:       "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
			Stock:       40,
			CreatedAt:   time.Now().UTC().Add(7 * time.Minute),
		},
		{
			ID:          bson.NewObjectID(),
			Name:        "Ergonomic Memory Foam Desk Chair",
			Description: "High-back mesh executive office chair with lumbar support, 3D adjustable armrests, and recline lock.",
			Price:       8999,
			Category:    "Home",
			Image:       "https://images.unsplash.com/photo-1580481077190-7361356a1421?auto=format&fit=crop&w=600&q=80",
			Stock:       8,
			CreatedAt:   time.Now().UTC().Add(8 * time.Minute),
		},
	}

	var documents []interface{}
	for _, p := range seedProducts {
		documents = append(documents, p)
	}

	res, err := collection.InsertMany(ctx, documents)
	if err != nil {
		log.Fatalf("Failed to seed products: %v", err)
	}

	fmt.Printf(" Seeded %d products successfully into MongoDB!\n", len(res.InsertedIDs))
}
