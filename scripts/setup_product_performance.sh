#!/bin/bash

# Setup script for Product Performance Tracking System
# This script will create the necessary database tables and populate them with sample data

echo "Setting up Product Performance Tracking System..."

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set."
    echo "Please set these variables in your .env file or export them in your terminal."
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

# Get database connection details from .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Prompt for database connection details if not set
if [ -z "$DB_HOST" ]; then
    read -p "Enter database host (default: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
fi

if [ -z "$DB_PORT" ]; then
    read -p "Enter database port (default: 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
fi

if [ -z "$DB_NAME" ]; then
    read -p "Enter database name: " DB_NAME
    if [ -z "$DB_NAME" ]; then
        echo "Error: Database name is required."
        exit 1
    fi
fi

if [ -z "$DB_USER" ]; then
    read -p "Enter database user: " DB_USER
    if [ -z "$DB_USER" ]; then
        echo "Error: Database user is required."
        exit 1
    fi
fi

if [ -z "$DB_PASSWORD" ]; then
    read -s -p "Enter database password: " DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        echo "Warning: No password provided. Continuing without password."
    fi
fi

# Set PGPASSWORD environment variable for psql
export PGPASSWORD="$DB_PASSWORD"

# Function to run SQL script
run_sql_script() {
    local script_path="$1"
    local script_name="$(basename "$script_path")"
    
    echo "Running $script_name..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$script_path"; then
        echo "✅ $script_name executed successfully."
        return 0
    else
        echo "❌ Error executing $script_name."
        return 1
    fi
}

# Create tables
if run_sql_script "$SCRIPT_DIR/create_product_performance_tables.sql"; then
    echo "Product performance tables created successfully."
else
    echo "Error creating product performance tables. Exiting."
    exit 1
fi

# Populate tables with sample data
if run_sql_script "$SCRIPT_DIR/populate_product_performance.sql"; then
    echo "Sample data inserted successfully."
else
    echo "Error inserting sample data. Exiting."
    exit 1
fi

# Enable RLS if needed
read -p "Do you want to enable Row Level Security for product performance tables? (y/n): " enable_rls
if [[ "$enable_rls" =~ ^[Yy]$ ]]; then
    if run_sql_script "$SCRIPT_DIR/enable_rls_with_policies.sql"; then
        echo "Row Level Security enabled successfully."
    else
        echo "Error enabling Row Level Security."
    fi
fi

echo
echo "🎉 Product Performance Tracking System setup complete!"
echo
echo "Next steps:"
echo "1. Restart your Next.js server if it's running"
echo "2. Navigate to the Product Performance dashboard in your browser"
echo "3. Check the documentation at docs/PRODUCT-PERFORMANCE.md for more information"
echo

# Unset PGPASSWORD for security
unset PGPASSWORD

exit 0 