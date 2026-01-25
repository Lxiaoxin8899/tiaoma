# Docker 开发设计计划

## 现状分析
- 当前前端为 React + Vite，桌面端用 Electron 包装。
- 数据层以 Electron 主进程 SQLite 为主，浏览器调试回退 localStorage。
- 代码中提供了本地 supabase 兼容层，线上模式通过环境变量可切换。
- 生产构建输出 dist/，Electron 通过 file:// 或自定义协议加载。

## 目标架构（服务器 + Docker）
- web：React/Vite 构建产物，Nginx 提供静态服务。
- api：Supabase 风格 API（PostgREST + GoTrue），提供 REST/认证能力。
- db：集中式 PostgreSQL，用于多用户并发与统一数据源。
- 备份/导出：改为后端统一处理，保留审计日志与备份能力。

## Docker 目录说明
- docker/docker-compose.dev.yml：本地开发容器（仅前端）。
- docker/docker-compose.prod.yml：生产构建容器（仅前端）。
- docker/docker-compose.online.yml：线上后端（auth/rest/gateway，默认外部数据库）。
- docker/docker-compose.online.db.yml：本地数据库容器补充（db/migrate）。
- docker/web/Dockerfile.dev：前端开发镜像。
- docker/web/Dockerfile.prod：前端生产镜像（多阶段构建）。
- docker/web/nginx.conf：生产 Nginx 配置（SPA 路由回退）。
- docker/supabase/supabase.env.example：线上后端环境变量示例（需复制为 supabase.env）。
- docker/supabase/nginx.conf：API 网关配置（/rest/v1 与 /auth/v1）。
- docker/supabase/migrate.sh：自动执行 supabase/migrations 的脚本。

## 开发模式（当前可用）
1. 运行：`docker compose -f docker/docker-compose.dev.yml up --build`
2. 访问：`http://localhost:5173`
3. 说明：目前仍是“离线数据模式”，数据保存在浏览器 localStorage。

## 生产模式（当前可用）
1. 运行：`docker compose -f docker/docker-compose.prod.yml up --build`
2. 访问：`http://localhost:8080`
3. 说明：当前是纯静态部署，不包含服务端数据库与 API。

## 线上后端（当前可用）
1. 准备环境变量：复制 `docker/supabase/supabase.env.example` 为 `docker/supabase/supabase.env` 并填写真实值
2. 使用外部数据库（默认）：`docker compose -f docker/docker-compose.online.yml up --build`
3. 使用本地数据库容器：`docker compose -f docker/docker-compose.online.yml -f docker/docker-compose.online.db.yml up --build`
4. API 地址：`http://localhost:8000`（/rest/v1、/auth/v1）
5. 数据库：`localhost:54322`（仅本地调试）

## 前端接入线上模式（可选）
1. 配置环境变量：`VITE_DATA_MODE=online`
2. 配置 API：`VITE_SUPABASE_URL=http://localhost:8000`
3. 配置密钥：`VITE_SUPABASE_ANON_KEY=...`（见 docker/supabase/supabase.env）

## Docker 调试数据格式约定
> 说明：这里给出“未来 API 对接”的数据格式约定，用于开发联调与 mock 数据一致性。

### 统一响应包裹
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "string",
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 0
    }
  }
}
```

### 字段通用约束
- 主键 `id`：UUID 字符串。
- 时间字段：统一使用 ISO 8601（UTC），例如 `2026-01-17T03:12:45.000Z`。
- 软删除：核心表使用 `_deleted` 与 `_deleted_at` 标记（与现有前端一致）。
- 关联关系：使用 `*_id` 外键字段（如 `material_id`、`supplier_id`）。

### 典型实体示例
```json
{
  "material": {
    "id": "uuid",
    "code": "MAT-001",
    "name": "物料名称",
    "unit_id": "uuid",
    "category_id": "uuid",
    "supplier_id": "uuid",
    "status": "active",
    "created_at": "2026-01-17T03:12:45.000Z",
    "updated_at": "2026-01-17T03:12:45.000Z",
    "_deleted": false,
    "_deleted_at": null
  }
}
```

### 查询与分页建议
- 分页：`page` + `page_size`（或 `offset` + `limit`），返回 `meta.pagination`。
- 排序：`order=created_at.desc`（与 supabase 风格一致）。
- 过滤：`eq/lt/lte/gte/ilike` 等操作符，避免自定义过多语义。

## 数据库使用方式（服务器）
> 说明：此处为“迁移后端”的使用方式设计，用于后续评估与落地。

### 推荐选型
- 数据库：PostgreSQL（稳定、支持并发与审计需求）。
- 后端：Node.js/TypeScript（与前端统一语义，便于复用类型）。
- 迁移：优先复用 `supabase/migrations` 作为 schema 起点。

### 表与字段建议
- 核心表：materials、material_batches、suppliers、barcodes、material_categories、units。
- 管理表：users、sessions、system_settings、audit_logs。
- 公共字段：`id`、`created_at`、`updated_at`、`deleted`/`deleted_at`（或保留 `_deleted` 兼容前端）。

### 索引建议
- 按 `updated_at` 排序索引，保证列表加载速度。
- 按外键字段（`material_id`、`batch_id`、`supplier_id`）建索引，提升联表效率。

### 迁移与兼容
- 先提供“只读 API”，验证查询链路与分页性能。
- 再切换为“读写 API”，并启用软删除与审计日志。
- 迁移数据源顺序：SQLite/localStorage → 导出 JSON → 后端导入。

## 迁移计划（从单机到服务器）
### 阶段 0：需求确认
- 是否保留 Electron 客户端，还是完全转 Web。
- 多用户并发、权限、审计、备份的真实目标与 SLA。
- 选择后端方案：自建 API 或恢复 Supabase 线上模式。

### 阶段 1：后端服务与数据层
- 设计数据表结构与迁移策略（可复用 supabase/migrations）。
- 实现 API：materials/batches/suppliers/barcodes/users/audit_logs 等。
- 设计认证与授权：JWT + 角色权限。

### 阶段 2：前端适配
- 将 `src/lib/supabase.ts` 改为可配置的在线/离线模式。
- 将本地 SQLite/IPC 调用迁移为 HTTP API。
- 统一错误处理与重试策略。

### 阶段 3：数据迁移与上线
- 提供 SQLite/localStorage 数据导出脚本。
- 后端导入并校验一致性。
- 运行双写或灰度验证，确认无数据丢失。

### 阶段 4：运维与安全
- Docker Compose/Swarm/K8s 部署拓扑与资源配置。
- 备份策略、日志与监控（Prometheus/ELK）。
- HTTPS、访问控制与审计归档。

## 风险与待确认
- Electron 的数据库与浏览器数据源不同步，迁移需统一。
- 现有离线逻辑较多，改造需明确在线优先策略。
- better-sqlite3 依赖原生构建，镜像需安装编译工具。
