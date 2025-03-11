@echo off
setlocal enabledelayedexpansion

echo Setting up Product Performance Tracking System...

REM Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if "%SUPABASE_URL%"=="" (
    echo Error: SUPABASE_URL environment variable must be set.
    echo Please set this variable in your .env file or set it in your terminal.
    goto :error
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo Error: SUPABASE_SERVICE_ROLE_KEY environment variable must be set.
    echo Please set this variable in your .env file or set it in your terminal.
    goto :error
)

REM Get the directory of this script
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Check if psql is installed
where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: psql is not installed. Please install PostgreSQL client tools.
    goto :error
)

REM Get database connection details from .env file if it exists
if exist "%PROJECT_ROOT%\.env" (
    for /f "tokens=1,2 delims==" %%a in (%PROJECT_ROOT%\.env) do (
        set "%%a=%%b"
    )
)

REM Prompt for database connection details if not set
if "%DB_HOST%"=="" (
    set /p DB_HOST="Enter database host (default: localhost): "
    if "!DB_HOST!"=="" set "DB_HOST=localhost"
)

if "%DB_PORT%"=="" (
    set /p DB_PORT="Enter database port (default: 5432): "
    if "!DB_PORT!"=="" set "DB_PORT=5432"
)

if "%DB_NAME%"=="" (
    set /p DB_NAME="Enter database name: "
    if "!DB_NAME!"=="" (
        echo Error: Database name is required.
        goto :error
    )
)

if "%DB_USER%"=="" (
    set /p DB_USER="Enter database user: "
    if "!DB_USER!"=="" (
        echo Error: Database user is required.
        goto :error
    )
)

if "%DB_PASSWORD%"=="" (
    set /p DB_PASSWORD="Enter database password: "
    if "!DB_PASSWORD!"=="" (
        echo Warning: No password provided. Continuing without password.
    )
)

REM Function to run SQL script
:run_sql_script
set "script_path=%~1"
for %%F in ("%script_path%") do set "script_name=%%~nxF"

echo Running %script_name%...

psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f "%script_path%" -w
if %ERRORLEVEL% neq 0 (
    echo ❌ Error executing %script_name%.
    exit /b 1
) else (
    echo ✅ %script_name% executed successfully.
    exit /b 0
)

REM Create tables
call :run_sql_script "%SCRIPT_DIR%create_product_performance_tables.sql"
if %ERRORLEVEL% neq 0 (
    echo Error creating product performance tables. Exiting.
    goto :error
) else (
    echo Product performance tables created successfully.
)

REM Populate tables with sample data
call :run_sql_script "%SCRIPT_DIR%populate_product_performance.sql"
if %ERRORLEVEL% neq 0 (
    echo Error inserting sample data. Exiting.
    goto :error
) else (
    echo Sample data inserted successfully.
)

REM Enable RLS if needed
set /p enable_rls="Do you want to enable Row Level Security for product performance tables? (y/n): "
if /i "%enable_rls%"=="y" (
    call :run_sql_script "%SCRIPT_DIR%enable_rls_with_policies.sql"
    if %ERRORLEVEL% neq 0 (
        echo Error enabling Row Level Security.
    ) else (
        echo Row Level Security enabled successfully.
    )
)

echo.
echo 🎉 Product Performance Tracking System setup complete!
echo.
echo Next steps:
echo 1. Restart your Next.js server if it's running
echo 2. Navigate to the Product Performance dashboard in your browser
echo 3. Check the documentation at docs/PRODUCT-PERFORMANCE.md for more information
echo.

goto :end

:error
echo Setup failed.
exit /b 1

:end
endlocal
exit /b 0 