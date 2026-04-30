-- =============================================================================
-- Migration 00003: User Roles
-- Adds role-based access control table linking Supabase auth users to
-- application roles (admin, client). Includes helper function for RLS policies.
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'client');

CREATE TABLE user_roles (
    id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role       user_role   NOT NULL DEFAULT 'client',
    client_id  uuid        REFERENCES clients(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
