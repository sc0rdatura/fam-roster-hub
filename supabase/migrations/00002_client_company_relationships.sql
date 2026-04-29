-- =============================================================================
-- Migration 00002: Client-Company Relationships
-- Adds a table for tracking direct client-to-company relationships,
-- independent of credit-derived connections.
-- =============================================================================

CREATE TABLE client_company_relationships (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  heat_level  heat_level,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE UNIQUE INDEX uq_client_company_rel_client_company
  ON client_company_relationships (client_id, company_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_client_company_relationships_updated_at
  BEFORE UPDATE ON client_company_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
