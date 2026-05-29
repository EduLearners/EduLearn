# ============================================================
# seed-manual-users.ps1 — Create one login account per role
# for MANUAL testing of EduLearn.
#
# - Logs in as the seeded ITAdmin ('admin' / 'Admin@123').
# - Creates 6 role accounts via POST /api/users (ITAdmin-only).
# - All accounts: Status=Active, MFA DISABLED -> log in directly,
#   no authenticator app / TOTP needed.
# - Idempotent: a 409 "already exists" is treated as OK.
#
# Usage (from repo root, with the API running on https://localhost:5001):
#   powershell -ExecutionPolicy Bypass -File tests\seed-manual-users.ps1
#
# Optional: override the base URL
#   powershell -File tests\seed-manual-users.ps1 -ApiBase https://localhost:5001
# ============================================================

param(
    [string]$ApiBase = "https://localhost:5001",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "Admin@123"
)

# --- Accept the local dev certificate (self-signed) in Windows PowerShell 5.1 ---
if (-not ("TrustAllCertsPolicy" -as [type])) {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
"@
}
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    --  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    ERR $msg" -ForegroundColor Red }

# --- 1. Log in as admin -----------------------------------------------------
Write-Step "Logging in as '$AdminUser' at $ApiBase"
try {
    $loginBody = @{ usernameOrEmail = $AdminUser; password = $AdminPass } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/auth/login" -ContentType "application/json" -Body $loginBody -ErrorAction Stop
} catch {
    Write-Err "Admin login failed. Is the API running on $ApiBase ? $($_.Exception.Message)"
    exit 1
}
if (-not $login.token) {
    Write-Err "Admin login did not return a token (response: $($login | ConvertTo-Json -Compress))."
    Write-Err "If 'admin' has MFA enabled, disable it from the profile or reset via SQL before seeding."
    exit 1
}
$token = $login.token
Write-Ok "Got admin JWT (role=$($login.role))"
$headers = @{ Authorization = "Bearer $token" }

# --- 2. Define the role accounts -------------------------------------------
# Password rule: minimum 8 characters (no other complexity requirement).
# FullName rule: letters, spaces, hyphens, apostrophes, dots ONLY (no digits).
$accounts = @(
    @{ Username = "student";    FullName = "Test Student";       Email = "student@edulearn.local";    Role = "Student";    Password = "Student@123"  },
    @{ Username = "instructor"; FullName = "Test Instructor";    Email = "instructor@edulearn.local"; Role = "Instructor"; Password = "Instructor@123" },
    @{ Username = "registrar";  FullName = "Test Registrar";     Email = "registrar@edulearn.local";  Role = "Registrar";  Password = "Registrar@123" },
    @{ Username = "deptadmin";  FullName = "Test Dept Admin";    Email = "deptadmin@edulearn.local";  Role = "DeptAdmin";  Password = "DeptAdmin@123" },
    @{ Username = "finance";    FullName = "Test Finance";       Email = "finance@edulearn.local";    Role = "Finance";    Password = "Finance@123"   },
    @{ Username = "auditor";    FullName = "Test Auditor";       Email = "auditor@edulearn.local";    Role = "Auditor";    Password = "Auditor@123"   }
)

# --- 3. Create each account (idempotent) -----------------------------------
Write-Step "Creating role accounts via POST /api/users"
foreach ($a in $accounts) {
    $body = @{
        username   = $a.Username
        fullName   = $a.FullName
        email      = $a.Email
        role       = $a.Role
        password   = $a.Password
        sendInvite = $false
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Method Post -Uri "$ApiBase/api/users" -Headers $headers -ContentType "application/json" -Body $body -ErrorAction Stop | Out-Null
        Write-Ok "$($a.Role.PadRight(11)) -> $($a.Username)"
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -eq 409) {
            Write-Warn2 "$($a.Role.PadRight(11)) -> $($a.Username) already exists (skipped)"
        } else {
            Write-Err "$($a.Role.PadRight(11)) -> $($a.Username) failed (HTTP $status): $($_.Exception.Message)"
        }
    }
}

# --- 4. Print the credentials table ----------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor White
Write-Host " EduLearn manual-test login accounts (MFA disabled)" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White
Write-Host (" {0,-12} {1,-12} {2}" -f "ROLE", "USERNAME", "PASSWORD") -ForegroundColor White
Write-Host " ITAdmin      admin        Admin@123"
Write-Host " Student      student      Student@123"
Write-Host " Instructor   instructor   Instructor@123"
Write-Host " Registrar    registrar    Registrar@123"
Write-Host " DeptAdmin    deptadmin    DeptAdmin@123"
Write-Host " Finance      finance      Finance@123"
Write-Host " Auditor      auditor      Auditor@123"
Write-Host "============================================================" -ForegroundColor White
Write-Host " Frontend: http://localhost:5173/login" -ForegroundColor White
Write-Host " Swagger : $ApiBase/swagger" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White
