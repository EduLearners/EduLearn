@echo off
REM ============================================
REM EduLearn v11.0 — Apply EF Core Migrations
REM Monolithic API: single AppDbContext
REM Database: EduLearnDb on (localdb)\MSSQLLocalDB
REM Project: EduLearn.API
REM ============================================

cd /d "%~dp0"

echo ========================================
echo EduLearn — Apply Database Migrations
echo Server: (localdb)\MSSQLLocalDB
echo Database: EduLearnDb
echo ========================================
echo.

dotnet ef --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: dotnet-ef global tool is not installed.
    echo Run: dotnet tool install --global dotnet-ef
    pause
    exit /b 1
)

echo Applying migrations...
dotnet ef database update --project EduLearn.API --startup-project EduLearn.API
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Migration failed. Check errors above.
    pause
    exit /b 1
)
echo DONE
echo.

echo ========================================
echo Database migration complete.
echo Database: EduLearnDb
echo Run the API: dotnet run --project EduLearn.API
echo Swagger:    https://localhost:5001/swagger
echo ========================================
pause
