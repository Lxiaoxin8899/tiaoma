#!/usr/bin/env sh
set -eu

# Wait for database to be ready
export PGPASSWORD="$DB_PASSWORD"

max_wait=60
waited=0
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  waited=$((waited + 1))
  if [ "$waited" -ge "$max_wait" ]; then
    echo "Database startup timeout, aborting migrations" >&2
    exit 1
  fi
  sleep 2
done

# Use a dedicated migration table to avoid conflicts with Supabase internals
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE IF NOT EXISTS public.app_schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());"

# Apply migrations in filename order
for file in /migrations/*.sql; do
  if [ ! -f "$file" ]; then
    continue
  fi
  filename=$(basename "$file")
  applied=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tA \
    -c "SELECT 1 FROM public.app_schema_migrations WHERE filename='${filename}' LIMIT 1;")
  if [ "$applied" = "1" ]; then
    echo "Skip migration: $filename"
    continue
  fi

  echo "Apply migration: $filename"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$file"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO public.app_schema_migrations (filename) VALUES ('${filename}');"
done

echo "Migrations complete"
