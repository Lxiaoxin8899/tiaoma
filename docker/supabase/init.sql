-- Create auth schema required by GoTrue if missing
CREATE SCHEMA IF NOT EXISTS auth;

-- Pre-seed GoTrue migration to skip a backfill that fails on uuid identities
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
  version varchar(255) PRIMARY KEY
);
INSERT INTO auth.schema_migrations (version)
VALUES ('20221208132122')
ON CONFLICT DO NOTHING;
