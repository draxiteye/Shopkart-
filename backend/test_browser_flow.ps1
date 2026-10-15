$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8080"
$timeout = 5 # 5-second timeout on all network requests

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "ShopKart Complete End-to-End User Journey" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$uniqueEmail = "sarah_$(Get-Random)@example.com"

# Check 1: Register
Write-Host -NoNewline "Step 1: Customer Registration (POST /customers/register)... "
$regBody = @{
    fullName = "Sarah Connor"
    email    = $uniqueEmail
    password = "securePassword123"
    phone    = "9123456780"
} | ConvertTo-Json

try {
    $regRes = Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $regBody -ContentType "application/json" -TimeoutSec $timeout
    if ($regRes.success -eq $true -and $regRes.customer.email -eq $uniqueEmail) {
        Write-Host "[PASS] (201 Created, Email=$uniqueEmail)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Registration failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 2: Login
Write-Host -NoNewline "Step 2: Customer Login (POST /customers/login)... "
$loginBody = @{
    email    = $uniqueEmail
    password = "securePassword123"
} | ConvertTo-Json

try {
    $loginRes = Invoke-WebRequest -Uri "$baseUrl/customers/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    $cookies = $session.Cookies.GetCookies([System.Uri]"$baseUrl")
    $authCookie = $cookies["shopkart_auth"]
    if ($loginRes.StatusCode -eq 200 -and $authCookie) {
        Write-Host "[PASS] (200 OK, HttpOnly Cookie Attached)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Login cookie missing" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 3: Protected /home profile
Write-Host -NoNewline "Step 3: Authenticated Protected Home (GET /customers/me)... "
try {
    $meRes = Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($meRes.email -eq $uniqueEmail) {
        Write-Host "[PASS] (200 OK, Welcome $($meRes.fullName))" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Profile mismatch" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 4: Browse Products
Write-Host -NoNewline "Step 4: Browse Products Catalogue (GET /products)... "
$firstProductId = ""
try {
    $prodRes = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET -TimeoutSec $timeout
    if ($prodRes.success -eq $true -and $prodRes.count -ge 1) {
        $firstProductId = $prodRes.products[0]._id
        Write-Host "[PASS] (200 OK, Count=$($prodRes.count) products)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] No products returned" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 5: Search Products
Write-Host -NoNewline "Step 5: Product Search (GET /products?search=Headphones)... "
try {
    $searchRes = Invoke-RestMethod -Uri "$baseUrl/products?search=Headphones" -Method GET -TimeoutSec $timeout
    if ($searchRes.count -ge 1 -and $searchRes.products[0].name -match "Headphones") {
        Write-Host "[PASS] (200 OK, Found '$($searchRes.products[0].name)')" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Search returned 0 matching products" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 6: Filter Category
Write-Host -NoNewline "Step 6: Category Filter (GET /products?category=Fashion)... "
try {
    $catRes = Invoke-RestMethod -Uri "$baseUrl/products?category=Fashion" -Method GET -TimeoutSec $timeout
    if ($catRes.count -ge 1) {
        Write-Host "[PASS] (200 OK, Found $($catRes.count) fashion items)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Category filter returned 0 items" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 7: Product Details
Write-Host -NoNewline "Step 7: Product Details (GET /products/:id)... "
try {
    $detailRes = Invoke-RestMethod -Uri "$baseUrl/products/$firstProductId" -Method GET -TimeoutSec $timeout
    if ($detailRes.success -eq $true -and $detailRes.product._id -eq $firstProductId) {
        Write-Host "[PASS] (200 OK, Item='$($detailRes.product.name)', Price=₹$($detailRes.product.price))" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Product details lookup failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 8: Logout
Write-Host -NoNewline "Step 8: Customer Logout (POST /customers/logout)... "
try {
    $logoutRes = Invoke-RestMethod -Uri "$baseUrl/customers/logout" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($logoutRes.success -eq $true) {
        Write-Host "[PASS] (200 OK, Logged out successfully)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Logout failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 9: Protected /home after Logout
Write-Host -NoNewline "Step 9: Access Protected /home after Logout (Must return 401)... "
try {
    $meAfterLogout = Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
    Write-Host "[FAIL] Expected 401 Unauthorized but request succeeded!" -ForegroundColor Red
    exit 1
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[PASS] (Correctly rejected with 401 Unauthorized -> Navigates to /login)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Expected 401, got $statusCode" -ForegroundColor Red
        exit 1
    }
}

exit 0
