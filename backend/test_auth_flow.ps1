$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8080"
$timeout = 5 # 5-second timeout on all network requests

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ShopKart Authentication Flow Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$randomSuffix = Get-Random
$testEmail = "alex_$randomSuffix@example.com"

# Check 1: Register
Write-Host -NoNewline "Check 1: Customer Registration (POST /customers/register)... "
$regBody = @{
    fullName = "Alex Taylor"
    email    = $testEmail
    password = "alexpassword123"
    phone    = "9876543210"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/customers/register" -Method POST -Body $regBody -ContentType "application/json" -TimeoutSec $timeout
    if ($regResponse.success -eq $true -and $regResponse.customer.email -eq $testEmail) {
        Write-Host "[PASS] (201 Created)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected response: $regResponse" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 2: Login & HttpOnly Cookie
Write-Host -NoNewline "Check 2: Customer Login & HttpOnly Cookie (POST /customers/login)... "
$loginBody = @{
    email    = $testEmail
    password = "alexpassword123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/customers/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -TimeoutSec $timeout
    $cookies = $session.Cookies.GetCookies([System.Uri]"$baseUrl")
    $authCookie = $cookies["shopkart_auth"]

    if ($loginResponse.StatusCode -eq 200 -and $authCookie -and $authCookie.Value -and $authCookie.HttpOnly -eq $true) {
        Write-Host "[PASS] (200 OK, Cookie Name=$($authCookie.Name), HttpOnly=$($authCookie.HttpOnly))" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Missing or invalid HttpOnly cookie!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 3: Protected /customers/me
Write-Host -NoNewline "Check 3: Protected Current-Customer (GET /customers/me)... "
try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
    if ($meResponse.email -eq $testEmail -and $null -eq $meResponse.password) {
        Write-Host "[PASS] (200 OK, Name=$($meResponse.fullName), Email=$($meResponse.email))" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Expected email $testEmail, got $($meResponse.email)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 4: Logout
Write-Host -NoNewline "Check 4: Customer Logout (POST /customers/logout)... "
try {
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/customers/logout" -Method POST -WebSession $session -TimeoutSec $timeout
    if ($logoutResponse.success -eq $true) {
        Write-Host "[PASS] (200 OK, Session Cookie Cleared)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected response: $logoutResponse" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Error: $_" -ForegroundColor Red
    exit 1
}

# Check 5: Access /customers/me after Logout -> 401
Write-Host -NoNewline "Check 5: Access Protected /customers/me after Logout (Must return 401)... "
try {
    $meAfterLogout = Invoke-RestMethod -Uri "$baseUrl/customers/me" -Method GET -WebSession $session -TimeoutSec $timeout
    Write-Host "[FAIL] Expected 401 Unauthorized but request succeeded!" -ForegroundColor Red
    exit 1
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[PASS] (Correctly rejected with 401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Expected 401, got $statusCode" -ForegroundColor Red
        exit 1
    }
}

exit 0
