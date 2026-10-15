package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	DB *mongo.Database
)

// ConnectDB establishes a connection to MongoDB Community Server using the official Mongo Go Driver v2
func ConnectDB() *mongo.Database {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://127.0.0.1:27017"
	}

	dbName := os.Getenv("DATABASE_NAME")
	if dbName == "" {
		dbName = "shopkart"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(clientOptions)
	if err != nil {
		log.Fatalf("Failed to create MongoDB client: %v", err)
	}

	// Ping the primary to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB at %s: %v", mongoURI, err)
	}

	fmt.Println(" Connected to MongoDB successfully!")
	DB = client.Database(dbName)

	// Ensure unique index on customers.email
	ensureIndexes(DB)

	return DB
}

func ensureIndexes(db *mongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	customerColl := db.Collection("customers")
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	_, err := customerColl.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Printf("Warning: Failed to create unique index on customers.email: %v", err)
	} else {
		fmt.Println(" Ensured unique index on customers.email")
	}
}

// GetCollection returns a MongoDB collection reference from the active database
func GetCollection(name string) *mongo.Collection {
	if DB == nil {
		log.Fatal("Database connection not initialized")
	}
	return DB.Collection(name)
}
