@echo off
REM ============================================
REM EduLearn v11.0 — Generate EF Core Migration
REM Monolithic API: single AppDbContext
REM Project: EduLearn.API
REM Usage: add-migrations.bat <MigrationName>
REM ============================================

cd /d "%~dp0"

if "%~1"=="" (
    echo ERROR: Please provide a migration name.
    echo Usage: add-migrations.bat ^<MigrationName^>
    pause
    exit /b 1
)

echo ========================================
echo EduLearn — Generate Migration: %~1
echo ========================================
echo.

dotnet ef --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: dotnet-ef global tool is not installed.
    echo Run: dotnet tool install --global dotnet-ef
    pause
    exit /b 1
)

echo Generating migration: %~1
dotnet ef migrations add %~1 --project EduLearn.API --startup-project EduLearn.API
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Migration generation failed.
    pause
    exit /b 1
)
echo DONE
echo.

echo ========================================
echo Migration '%~1' generated successfully.
echo Next: Run migrate-database.bat
echo ========================================
pause
