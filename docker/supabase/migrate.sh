#!/usr/bin/env sh
set -eu

# 说明：等待数据库就绪，避免迁移抢跑
export PGPASSWORD="$DB_PASSWORD"

max_wait=60
waited=0
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  waited=$((waited + 1))
  if [ "$waited" -ge "$max_wait" ]; then
    echo "数据库启动超时，结束迁移" >&2
    exit 1
  fi
  sleep 2
done

# 说明：创建迁移记录表，保证脚本可重复执行
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE IF NOT EXISTS public.schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());"

# 说明：按文件名顺序执行迁移脚本（已执行则跳过）
for file in /migrations/*.sql; do
  if [ ! -f "$file" ]; then
    continue
  fi
  filename=$(basename "$file")
  applied=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tA \
    -c "SELECT 1 FROM public.schema_migrations WHERE filename='${filename}' LIMIT 1;")
  if [ "$applied" = "1" ]; then
    echo "跳过已执行迁移：$filename"
    continue
  fi

  echo "应用迁移：$filename"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$file"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO public.schema_migrations (filename) VALUES ('${filename}');"
done

echo "迁移完成"
