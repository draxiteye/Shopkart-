package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Product represents the MongoDB document in the "products" collection
type Product struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name        string        `bson:"name" json:"name"`
	Description string        `bson:"description" json:"description"`
	Price       float64       `bson:"price" json:"price"`
	Category    string        `bson:"category" json:"category"`
	Image       string        `bson:"image" json:"image"`
	Stock       int           `bson:"stock" json:"stock"`
	CreatedAt   time.Time     `bson:"createdAt" json:"createdAt"`
}

// CreateProductRequest defines the input payload for creating a product
type CreateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	Image       string  `json:"image"`
	Stock       *int    `json:"stock"` // Pointer so we can differentiate 0 from missing
}
