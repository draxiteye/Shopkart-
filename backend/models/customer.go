package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// CartItem represents a product reference and quantity inside a customer's cart
type CartItem struct {
	ProductID bson.ObjectID `bson:"productId" json:"productId"`
	Quantity  int           `bson:"quantity" json:"quantity"`
}

// PopulatedCartItem represents a cart item with the current Product details populated
type PopulatedCartItem struct {
	Product  Product `json:"product"`
	Quantity int     `json:"quantity"`
}

// Customer represents the MongoDB document in the "customers" collection
type Customer struct {
	ID        bson.ObjectID   `bson:"_id,omitempty" json:"_id"`
	FullName  string          `bson:"fullName" json:"fullName"`
	Email     string          `bson:"email" json:"email"`
	Password  string          `bson:"password" json:"-"` // Never serialized to JSON responses
	Phone     string          `bson:"phone" json:"phone"`
	Wishlist  []bson.ObjectID `bson:"wishlist,omitempty" json:"wishlist"`
	Cart      []CartItem      `bson:"cart,omitempty" json:"cart"`
	CreatedAt time.Time       `bson:"createdAt" json:"createdAt"`
}

// RegisterRequest defines the input payload for customer registration
type RegisterRequest struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone"`
}

// LoginRequest defines the input payload for customer login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// CustomerResponse represents the safe customer profile returned in API responses
type CustomerResponse struct {
	ID        bson.ObjectID   `json:"_id"`
	FullName  string          `json:"fullName"`
	Email     string          `json:"email"`
	Phone     string          `json:"phone"`
	Wishlist  []bson.ObjectID `json:"wishlist"`
	Cart      []CartItem      `json:"cart"`
	CreatedAt time.Time       `json:"createdAt,omitempty"`
}

// ToResponse converts a Customer document to a safe CustomerResponse
func (c *Customer) ToResponse() CustomerResponse {
	wishlist := c.Wishlist
	if wishlist == nil {
		wishlist = []bson.ObjectID{}
	}
	cart := c.Cart
	if cart == nil {
		cart = []CartItem{}
	}
	return CustomerResponse{
		ID:        c.ID,
		FullName:  c.FullName,
		Email:     c.Email,
		Phone:     c.Phone,
		Wishlist:  wishlist,
		Cart:      cart,
		CreatedAt: c.CreatedAt,
	}
}
