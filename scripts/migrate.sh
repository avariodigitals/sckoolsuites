#!/bin/bash
# Safe migration script - run this instead of psql directly
# It loads .env.local and runs the migration with the correct DATABASE_URL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env.local
if [ -f "$PROJECT_DIR/.env.local" ]; then
    echo "Loading .env.local..."
    export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs)
fi

if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading .env..."
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set."
    echo "Please set it in .env.local or export it manually:"
    echo "  export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "Running migration with DATABASE_URL..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/migrate-new-tables.sql"

echo "Migration complete!"
