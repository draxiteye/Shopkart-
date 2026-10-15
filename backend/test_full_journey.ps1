$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8080"
$timeout = 5 # 5s timeout on every request

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShopKart Full Stack E2E User Journey (Labs 1-3 + Extensions)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$rand = Get-Random
$email = "e2e_user_$rand@example.com"
$password = "strongPass123"

function Run-Step {
    param([string]$Title, [scriptblock]$Action)
    Write-Host -NoNewline "$Title... "
    try {
        & $Action
        Write-Host "[PASS]" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL]" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Yellow
        exit 1
    }
}

# Step 1: Customer Registration
Run-Step "Step 1: Register new customer (POST /customers/register)" {
    $body = @{
        fullName = "Elena Gilbert"
        email    = $email
        password = $password
        phone    = "9876543210"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $body -ContentType "application/json" -TimeoutSec $timeout
    if ($res.success -ne $true -or $res.customer.email -ne $email) { throw "Registration failed" }
}

# Step 2: Customer Login
Run-Step "Step 2: Customer Login (POST /customers/login)" {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $res = Invoke-WebRequest -Uri "$baseUrl/customers/login" -Method POST -Body $body -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    $cookies = $session.Cookies.GetCookies([System.Uri]"$baseUrl")
    $authCookie = $cookies["shopkart_auth"]
    if ($res.StatusCode -ne 200 -or -not $authCookie -or $authCookie.HttpOnly -ne $true) {
        throw "Login failed or HttpOnly cookie missing"
    }
}

# Step 3: Current Customer Profile
Run-Step "Step 3: Authenticated /customers/me" {
    $res = Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($res.email -ne $email) { throw "Profile email mismatch" }
}

# Step 4: Browse Products Catalogue
$global:prod1 = $null
$global:prod2 = $null
Run-Step "Step 4: Browse Products (GET /products)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET -TimeoutSec $timeout
    if ($res.count -lt 2) { throw "Need at least 2 products" }
    $global:prod1 = $res.products[0]
    $global:prod2 = $res.products[1]
}

# Step 5: Add to Wishlist
Run-Step "Step 5: Add product to Wishlist (POST /wishlist/:id)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/wishlist/$($global:prod1._id)" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($res.success -ne $true) { throw "Wishlist add failed" }
}

# Step 6: Prevent duplicate Wishlist entry
Run-Step "Step 6: Prevent duplicate Wishlist entry (Must return 409)" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/wishlist/$($global:prod1._id)" -Method POST -WebSession $session -TimeoutSec $timeout
        throw "Expected 409 Conflict"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw "Expected 409, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# Step 7: Get Wishlist (Populated product details)
Run-Step "Step 7: Get Wishlist (GET /wishlist)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/wishlist" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($res.count -ne 1 -or $res.wishlist[0].name -ne $global:prod1.name) { throw "Wishlist populate failed" }
}

# Step 8: Remove from Wishlist
Run-Step "Step 8: Remove from Wishlist (DELETE /wishlist/:id)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/wishlist/$($global:prod1._id)" -Method DELETE -WebSession $session -TimeoutSec $timeout
    if ($res.success -ne $true) { throw "Wishlist remove failed" }
    $check = Invoke-RestMethod -Uri "$baseUrl/wishlist" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($check.count -ne 0) { throw "Wishlist should be empty" }
}

# Step 9: Add to Cart (quantity 1)
Run-Step "Step 9: Add product to Cart (POST /cart/:id -> qty 1)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/cart/$($global:prod1._id)" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($res.cart.Count -ne 1 -or $res.cart[0].quantity -ne 1) { throw "Cart quantity 1 failed" }
}

# Step 10: Increment in Cart (quantity 2)
Run-Step "Step 10: Add same product to Cart (POST /cart/:id -> qty 2)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/cart/$($global:prod1._id)" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($res.cart[0].quantity -ne 2) { throw "Cart quantity 2 failed" }
}

# Step 11: Update Cart quantity (PATCH /cart/:id -> qty 3)
Run-Step "Step 11: Update Cart quantity (PATCH /cart/:id -> qty 3)" {
    $body = @{ quantity = 3 } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/cart/$($global:prod1._id)" -Method PATCH -Body $body -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    if ($res.cart[0].quantity -ne 3) { throw "Cart patch quantity failed" }
}

# Step 12: Get Cart (Resolved Product details)
Run-Step "Step 12: Get Cart (GET /cart)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/cart" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($res.cart.Count -ne 1 -or $res.cart[0].product.name -ne $global:prod1.name) { throw "Cart resolve failed" }
}

# Step 13: Initiate Checkout (POST /orders/create-payment-order)
$global:orderId = $null
$global:razorpayOrderId = $null
Run-Step "Step 13: Create Payment Order (POST /orders/create-payment-order)" {
    $shipping = @{
        shippingAddress = @{
            fullName     = "Elena Gilbert"
            phone        = "9876543210"
            addressLine1 = "Mystic Falls High St"
            city         = "Mystic Falls"
            state        = "Virginia"
            pincode      = "220001"
        }
        totalAmount = 1.0 # Client fake total - MUST BE IGNORED by server
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/orders/create-payment-order" -Method POST -Body $shipping -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    if (-not $res.orderId -or -not $res.razorpayOrderId) { throw "Order creation failed" }
    $expectedTotal = $global:prod1.price * 3
    if ($res.amount -ne $expectedTotal) { throw "Expected server total $expectedTotal, got $($res.amount)" }
    $global:orderId = $res.orderId
    $global:razorpayOrderId = $res.razorpayOrderId
}

# Step 14: Cart remains intact before payment verification
Run-Step "Step 14: Cart remains intact before payment verification" {
    $cart = Invoke-RestMethod -Uri "$baseUrl/cart" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($cart.cart.Count -ne 1) { throw "Cart should NOT be cleared yet" }
}

# Step 15: Invalid Razorpay signature rejected (400)
Run-Step "Step 15: Invalid signature rejected (POST /orders/verify-payment -> 400)" {
    $fakeVerify = @{
        shopKartOrderId     = $global:orderId
        razorpay_order_id   = $global:razorpayOrderId
        razorpay_payment_id = "pay_fake"
        razorpay_signature  = "invalid_sig"
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/orders/verify-payment" -Method POST -Body $fakeVerify -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
        throw "Expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400" }
    }
}

# Step 16: Valid payment verification succeeds and clears cart
Run-Step "Step 16: Verify payment succeeds (POST /orders/verify-payment)" {
    $verify = @{
        shopKartOrderId     = $global:orderId
        razorpay_order_id   = $global:razorpayOrderId
        razorpay_payment_id = "pay_test_$(Get-Random)"
        razorpay_signature  = "sim_sig_test"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/orders/verify-payment" -Method POST -Body $verify -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    if ($res.order.paymentStatus -ne "PAID" -or $res.order.status -ne "PLACED") { throw "Order status not updated to PAID/PLACED" }
}

# Step 17: Backend Cart cleared after verified payment
Run-Step "Step 17: Backend Cart cleared after verified payment" {
    $cart = Invoke-RestMethod -Uri "$baseUrl/cart" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($cart.cart.Count -ne 0) { throw "Cart was not cleared after payment" }
}

# Step 18: Get Orders list contains placed order
Run-Step "Step 18: Orders history (GET /orders)" {
    $orders = Invoke-RestMethod -Uri "$baseUrl/orders" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($orders.count -lt 1 -or $orders.orders[0]._id -ne $global:orderId) { throw "Order missing from history" }
}

# Step 19: Get Single Order details with purchase-time snapshot
Run-Step "Step 19: Order details (GET /orders/:id)" {
    $detail = Invoke-RestMethod -Uri "$baseUrl/orders/$($global:orderId)" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($detail.order._id -ne $global:orderId -or $detail.order.items[0].price -ne $global:prod1.price) {
        throw "Order details snapshot mismatch"
    }
}

# Step 20: Logout
Run-Step "Step 20: Logout (POST /customers/logout)" {
    $logout = Invoke-RestMethod -Uri "$baseUrl/customers/logout" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($logout.success -ne $true) { throw "Logout failed" }
}

# Step 21: Protected routes blocked after logout
Run-Step "Step 21: Protected routes return 401 after logout" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
        throw "Expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401" }
    }
    try {
        Invoke-RestMethod -Uri "$baseUrl/cart" -Method GET -WebSession $session -TimeoutSec $timeout
        throw "Expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401" }
    }
    try {
        Invoke-RestMethod -Uri "$baseUrl/wishlist" -Method GET -WebSession $session -TimeoutSec $timeout
        throw "Expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401" }
    }
    try {
        Invoke-RestMethod -Uri "$baseUrl/orders" -Method GET -WebSession $session -TimeoutSec $timeout
        throw "Expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401" }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "All 21 End-to-End User Journey Steps Passed with 100% Success!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

exit 0
