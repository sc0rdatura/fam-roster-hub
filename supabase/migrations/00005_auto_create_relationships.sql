-- =============================================================================
-- Migration 00005: Auto-create relationships on credit publication
--
-- Postgres function callable via supabase.rpc('auto_create_relationships').
-- Given a credit_id, finds all people on that credit's project and
-- creates or upgrades relationship records for the credit's client.
--
-- Merge rules (from spec Section 4.1):
--   No relationship exists        → INSERT with heat_level = 'Direct Collaborator'
--   Exists at Cold/Warm/Hot       → UPDATE heat_level to 'Direct Collaborator'
--   Already Direct Collaborator   → Touch updated_at only
--   Unpublish/delete credit later → No change (relationships are historical)
--
-- SECURITY DEFINER so it can write to relationships regardless of the
-- caller's RLS context. Caller must pass a valid credit_id.
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_relationships(p_credit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id  uuid;
  v_project_id uuid;
  v_person     record;
BEGIN
  -- Look up the credit's client and project
  SELECT client_id, project_id
    INTO v_client_id, v_project_id
    FROM credits
   WHERE id = p_credit_id
     AND deleted_at IS NULL;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Credit not found or deleted: %', p_credit_id;
  END IF;

  -- For each person on this project, upsert a relationship
  FOR v_person IN
    SELECT DISTINCT pp.person_id
      FROM project_people pp
     WHERE pp.project_id = v_project_id
  LOOP
    INSERT INTO relationships (
      client_id,
      person_id,
      heat_level,
      created_from_credit
    )
    VALUES (
      v_client_id,
      v_person.person_id,
      'Direct Collaborator',
      true
    )
    ON CONFLICT (client_id, person_id) WHERE deleted_at IS NULL
    DO UPDATE SET
      heat_level         = 'Direct Collaborator',
      created_from_credit = true,
      updated_at         = now();
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (admins will call this via RPC)
GRANT EXECUTE ON FUNCTION auto_create_relationships(uuid) TO authenticated;
