package config

import (
	"os"

	razorpay "github.com/razorpay/razorpay-go"
)

// GetRazorpayClient returns a Razorpay client, the Key ID, and Key Secret from the environment.
// If either key is missing or blank, the client returned will be nil.
func GetRazorpayClient() (*razorpay.Client, string, string) {
	keyID := os.Getenv("RAZORPAY_KEY_ID")
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	if keyID == "" || keySecret == "" {
		return nil, keyID, keySecret
	}

	return razorpay.NewClient(keyID, keySecret), keyID, keySecret
}
