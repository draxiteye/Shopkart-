# ShopKart API Test Suite

$baseUrl = "http://127.0.0.1:8080"
$cookieJar = New-Object System.Net.CookieContainer

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$Script
    )
    Write-Host "Running: $Name..." -NoNewline
    try {
        & $Script
        Write-Host " [PASS]" -ForegroundColor Green
    } catch {
        Write-Host " [FAIL]" -ForegroundColor Red
        Write-Host $_ -ForegroundColor Yellow
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting ShopKart Backend Verification Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Health Check
Test-Endpoint "1. Health Check GET /" {
    $res = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    if ($res.success -ne $true) { throw "Expected success=true, got $($res.success)" }
}

# 2. Registration - Missing Fields
Test-Endpoint "2. Registration: Missing fields should return 400" {
    $body = @{ fullName = "John Doe"; email = ""; password = "password123"; phone = "1234567890" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 400 but succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 3. Registration - Password too short (<6 chars)
Test-Endpoint "3. Registration: Password < 6 chars should return 400" {
    $body = @{ fullName = "John Doe"; email = "short@example.com"; password = "123"; phone = "1234567890" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 400 but succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 4. Registration - Valid registration
$testEmail = "testuser_$(Get-Random)@example.com"
Test-Endpoint "4. Registration: Valid customer registration (201 Created)" {
    $body = @{ fullName = "Test Customer"; email = $testEmail; password = "secretpassword123"; phone = "9876543210" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $body -ContentType "application/json"
    if ($res.success -ne $true -or $res.customer.email -ne $testEmail) { throw "Registration failed: $res" }
    if ($res.customer.password) { throw "Password leaked in response!" }
}

# 5. Registration - Duplicate email
Test-Endpoint "5. Registration: Duplicate email should return 409 Conflict" {
    $body = @{ fullName = "Another Customer"; email = $testEmail; password = "secretpassword123"; phone = "9876543210" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 409 Conflict but succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw "Expected 409, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 6. Login - Nonexistent email
Test-Endpoint "6. Login: Nonexistent email returns generic 401" {
    $body = @{ email = "nonexistent_$(Get-Random)@example.com"; password = "secretpassword123" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/login" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 7. Login - Wrong password
Test-Endpoint "7. Login: Wrong password returns generic 401" {
    $body = @{ email = $testEmail; password = "wrongpassword" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/login" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 8. Login - Valid credentials (Sets HttpOnly Cookie)
$global:authCookie = $null
Test-Endpoint "8. Login: Valid credentials returns 200 and sets HttpOnly cookie" {
    $body = @{ email = $testEmail; password = "secretpassword123" } | ConvertTo-Json
    $req = [System.Net.HttpWebRequest]::Create("$baseUrl/customers/login")
    $req.Method = "POST"
    $req.ContentType = "application/json"
    $req.CookieContainer = $cookieJar
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    
    $response = $req.GetResponse()
    $cookies = $cookieJar.GetCookies([System.Uri]"$baseUrl")
    $authCookie = $cookies["shopkart_auth"]
    if (-not $authCookie) { throw "Cookie shopkart_auth was not set!" }
    if ($authCookie.HttpOnly -ne $true) { throw "Cookie is NOT HttpOnly!" }
    $global:authCookie = $authCookie.Value
    $response.Close()
}

# 9. GET /customers/me without cookie
Test-Endpoint "9. GET /customers/me: Missing cookie returns 401" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET
        throw "Expected 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 10. GET /customers/me with invalid cookie
Test-Endpoint "10. GET /customers/me: Invalid cookie returns 401" {
    try {
        $headers = @{ "Cookie" = "shopkart_auth=invalid.jwt.token" }
        Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -Headers $headers
        throw "Expected 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 11. GET /customers/me with valid session cookie
Test-Endpoint "11. GET /customers/me: Valid cookie returns customer info" {
    $req = [System.Net.HttpWebRequest]::Create("$baseUrl/customers/me")
    $req.Method = "GET"
    $req.CookieContainer = $cookieJar
    $req.Timeout = 5000
    $response = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $json = $reader.ReadToEnd() | ConvertFrom-Json
    $response.Close()
    if ($json.email -ne $testEmail) { throw "Expected email $testEmail, got $($json.email)" }
    if ($json.password) { throw "Password leaked in response!" }
}

# 12. POST /customers/logout
Test-Endpoint "12. Logout: POST /customers/logout clears cookie and invalidates access" {
    $req = [System.Net.HttpWebRequest]::Create("$baseUrl/customers/logout")
    $req.Method = "POST"
    $req.CookieContainer = $cookieJar
    $req.ContentLength = 0
    $response = $req.GetResponse()
    $response.Close()

    # After logout, check cookie value
    $cookies = $cookieJar.GetCookies([System.Uri]"$baseUrl")
    $c = $cookies["shopkart_auth"]
    if ($c -and $c.Value -ne "" -and $c.Expired -ne $true) {
        # Check calling /customers/me with cleared cookie
        try {
            $headers = @{ "Cookie" = "shopkart_auth=" }
            Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -Headers $headers
            throw "Expected 401 after logout"
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "Expected 401" }
        }
    }
}

Test-Endpoint "13. Product creation: price <= 0 returns 400" {
    $body = @{ name = "Invalid Item"; description = "Bad"; price = 0; category = "Test"; image = "http://example.com/img.jpg"; stock = 5 } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/products" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}


Test-Endpoint "14. Product creation: stock < 0 returns 400" {
    $body = @{ name = "Invalid Item"; description = "Bad"; price = 100; category = "Test"; image = "http://example.com/img.jpg"; stock = -1 } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/products" -Method POST -Body $body -ContentType "application/json"
        throw "Expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

$global:createdProductId = ""
Test-Endpoint "15. Product creation: Valid product returns 201 Created" {
    $body = @{
        name = "Mechanical Gaming Keyboard RGB"
        description = "High-precision mechanical keyboard with blue switches and customizable RGB backlighting."
        price = 2999
        category = "Electronics"
        image = "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80"
        stock = 15
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/products" -Method POST -Body $body -ContentType "application/json"
    if ($res.success -ne $true -or -not $res.product._id) { throw "Product creation failed" }
    $global:createdProductId = $res.product._id
}

Test-Endpoint "16. GET /products: Returns list of products" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET
    if ($res.success -ne $true -or $res.products.Count -lt 1) { throw "Expected products list" }
}

Test-Endpoint "17. GET /products/:id: Returns single product" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products/$($global:createdProductId)" -Method GET
    if ($res.success -ne $true -or $res.product.name -ne "Mechanical Gaming Keyboard RGB") { throw "Get product by ID failed" }
}

Test-Endpoint "18. GET /products/:id: Invalid hex ID returns 400" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/products/invalid-id-123" -Method GET
        throw "Expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "Expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

Test-Endpoint "19. GET /products/:id: Nonexistent valid hex ID returns 404" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/products/507f1f77bcf86cd799439011" -Method GET
        throw "Expected 404"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw "Expected 404, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

Test-Endpoint "20. GET /products?search=Keyboard: Returns matching products" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products?search=Keyboard" -Method GET
    if ($res.products.Count -lt 1) { throw "Expected to find keyboard" }
}

Test-Endpoint "21. GET /products?category=Electronics: Returns electronics" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products?category=Electronics" -Method GET
    if ($res.products.Count -lt 1) { throw "Expected to find Electronics" }
}

Test-Endpoint "22. GET /products?search=Gaming&category=Electronics: Returns match" {
    $res = Invoke-RestMethod -Uri "$baseUrl/products?search=Gaming&category=Electronics" -Method GET
    if ($res.products.Count -lt 1) { throw "Expected match for combined query" }
}
