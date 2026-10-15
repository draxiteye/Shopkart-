package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Payment status constants
const (
	PaymentStatusPending = "PENDING"
	PaymentStatusPaid    = "PAID"
	PaymentStatusFailed  = "FAILED"
)

// Order status constants
const (
	OrderStatusPendingPayment = "PENDING_PAYMENT"
	OrderStatusPlaced         = "PLACED"
	OrderStatusConfirmed      = "CONFIRMED"
	OrderStatusShipped        = "SHIPPED"
	OrderStatusDelivered      = "DELIVERED"
)

// OrderItem represents an immutable purchase-time snapshot of an ordered product
type OrderItem struct {
	ProductID bson.ObjectID `bson:"productId" json:"productId"`
	Name      string        `bson:"name" json:"name"`
	Price     float64       `bson:"price" json:"price"`
	Quantity  int           `bson:"quantity" json:"quantity"`
	Image     string        `bson:"image,omitempty" json:"image,omitempty"`
}

// ShippingAddress represents customer delivery coordinates
type ShippingAddress struct {
	FullName     string `bson:"fullName" json:"fullName"`
	Phone        string `bson:"phone" json:"phone"`
	AddressLine1 string `bson:"addressLine1" json:"addressLine1"`
	City         string `bson:"city" json:"city"`
	State        string `bson:"state" json:"state"`
	Pincode      string `bson:"pincode" json:"pincode"`
}

// Order represents an immutable finalized customer purchase in the "orders" collection
type Order struct {
	ID                bson.ObjectID   `bson:"_id,omitempty" json:"_id"`
	UserID            bson.ObjectID   `bson:"userId" json:"userId"`
	Items             []OrderItem     `bson:"items" json:"items"`
	ShippingAddress   ShippingAddress `bson:"shippingAddress" json:"shippingAddress"`
	TotalAmount       float64         `bson:"totalAmount" json:"totalAmount"`
	PaymentStatus     string          `bson:"paymentStatus" json:"paymentStatus"`
	Status            string          `bson:"status" json:"status"`
	RazorpayOrderID   string          `bson:"razorpayOrderId,omitempty" json:"razorpayOrderId,omitempty"`
	RazorpayPaymentID string          `bson:"razorpayPaymentId,omitempty" json:"razorpayPaymentId,omitempty"`
	CreatedAt         time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time       `bson:"updatedAt" json:"updatedAt"`
}

// CreatePaymentOrderRequest defines the input payload for initiating checkout
type CreatePaymentOrderRequest struct {
	ShippingAddress ShippingAddress `json:"shippingAddress"`
}

// VerifyPaymentRequest defines the input payload for Razorpay payment verification
type VerifyPaymentRequest struct {
	ShopKartOrderID   string `json:"shopKartOrderId"`
	RazorpayOrderID   string `json:"razorpay_order_id"`
	RazorpayPaymentID string `json:"razorpay_payment_id"`
	RazorpaySignature string `json:"razorpay_signature"`
}
