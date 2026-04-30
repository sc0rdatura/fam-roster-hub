-- =============================================================================
-- Migration 00004: Row Level Security Policies (Phase 1, Admin Only)
-- Enables RLS on all tables. Admins get full access. Lookup tables are
-- readable by any authenticated user. Client-scoped policies deferred
-- to Phase 2.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Enable RLS on every table
-- ---------------------------------------------------------------------------

-- Core tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Junction tables
ALTER TABLE project_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_companies ENABLE ROW LEVEL SECURITY;

-- Feature tables
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_company_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Lookup tables
ALTER TABLE credit_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_people_roles ENABLE ROW LEVEL SECURITY;

-- ProWee tables
ALTER TABLE prowee_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE prowee_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prowee_matches ENABLE ROW LEVEL SECURITY;

-- Auth table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Step 2: Admin full-access policies (one per table)
-- ---------------------------------------------------------------------------

CREATE POLICY "admin_all" ON clients
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON projects
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON credits
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON people
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON companies
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON project_people
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON project_companies
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON relationships
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON client_company_relationships
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON reels
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON awards
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON credit_roles
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON project_subtypes
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON project_people_roles
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON prowee_uploads
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON prowee_listings
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON prowee_matches
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "admin_all" ON user_roles
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Step 3: Lookup table read access for any authenticated user
-- ---------------------------------------------------------------------------

CREATE POLICY "authenticated_read" ON credit_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read" ON project_subtypes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read" ON project_people_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Step 4: user_roles self-read policy
-- ---------------------------------------------------------------------------

CREATE POLICY "self_read" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
