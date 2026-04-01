-- =============================================================================
-- FAM Roster Hub — Initial Schema Migration
-- Generated from FAM_Roster_Hub_Spec_v4_2.md, Section 4 (Core Data Model)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE client_role_type AS ENUM (
  'Composer',
  'Music Supervisor',
  'Music Editor',
  'Other'
);

CREATE TYPE project_category AS ENUM (
  'Film',
  'TV',
  'Games',
  'Theatre',
  'Other'
);

CREATE TYPE project_status AS ENUM (
  'In Production'
);

CREATE TYPE content_status AS ENUM (
  'draft',
  'published'
);

CREATE TYPE submitted_by_type AS ENUM (
  'admin',
  'client'
);

CREATE TYPE heat_level AS ENUM (
  'Cold',
  'Warm',
  'Hot',
  'Direct Collaborator'
);

CREATE TYPE award_result AS ENUM (
  'Won',
  'Nominated'
);

CREATE TYPE company_type AS ENUM (
  'Production Company',
  'Studio',
  'Network',
  'Streamer',
  'Agency',
  'Other'
);

CREATE TYPE project_company_role AS ENUM (
  'Production Company',
  'Studio',
  'Network',
  'Distributor',
  'Other'
);

-- ---------------------------------------------------------------------------
-- Lookup Tables
-- ---------------------------------------------------------------------------

CREATE TABLE project_subtypes (
  value         text PRIMARY KEY,
  display_label text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO project_subtypes (value, display_label) VALUES
  ('short',          'Short'),
  ('documentary',    'Documentary'),
  ('limited_series', 'Limited Series'),
  ('commercial',     'Commercial'),
  ('telefilm',       'Telefilm');

CREATE TABLE credit_roles (
  value         text PRIMARY KEY,
  display_label text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO credit_roles (value, display_label) VALUES
  ('composer',         'Composer'),
  ('additional_music', 'Additional Music'),
  ('music_editor',     'Music Editor'),
  ('music_supervisor', 'Music Supervisor'),
  ('score_producer',   'Score Producer');

CREATE TABLE project_people_roles (
  value         text PRIMARY KEY,
  display_label text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO project_people_roles (value, display_label) VALUES
  ('director',   'Director'),
  ('producer',   'Producer'),
  ('showrunner', 'Showrunner'),
  ('creator',    'Creator');

-- ---------------------------------------------------------------------------
-- Core Tables
-- ---------------------------------------------------------------------------

CREATE TABLE companies (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  name_variants text[],
  type          company_type NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE people (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     text NOT NULL,
  name_variants text[],
  primary_role  text,
  company_id    uuid REFERENCES companies(id) ON DELETE RESTRICT,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE clients (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name                text NOT NULL,
  role_type                client_role_type NOT NULL,
  headshot_url             text,
  press_photo_urls         text[],
  imdb_url                 text,
  website_url              text,
  bio_full                 text,
  bio_full_draft           text,
  bio_short                text,
  bio_short_draft          text,
  bio_status               content_status,
  base_locations           text[],
  nationalities            text[],
  primary_tax_territory    text,
  secondary_tax_territory  text,
  manager_name             text,
  manager_email            text,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

CREATE TABLE projects (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        text NOT NULL,
  category     project_category NOT NULL,
  sub_type     text REFERENCES project_subtypes(value) ON DELETE RESTRICT,
  year_start   integer,
  year_end     integer,
  status       project_status,
  imdb_url     text,
  external_url text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE UNIQUE INDEX uq_projects_title_category
  ON projects (title, category)
  WHERE deleted_at IS NULL;

CREATE TABLE credits (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  role           text NOT NULL REFERENCES credit_roles(value) ON DELETE RESTRICT,
  status         content_status NOT NULL DEFAULT 'draft',
  submitted_by   submitted_by_type NOT NULL,
  internal_notes text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE UNIQUE INDEX uq_credits_client_project
  ON credits (client_id, project_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Junction Tables
-- ---------------------------------------------------------------------------

CREATE TABLE project_people (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  person_id       uuid NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  role_on_project text NOT NULL REFERENCES project_people_roles(value) ON DELETE RESTRICT,
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX uq_project_people_role
  ON project_people (project_id, person_id, role_on_project)
  WHERE deleted_at IS NULL;

CREATE TABLE project_companies (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  role        project_company_role NOT NULL,
  deleted_at  timestamptz
);

CREATE TABLE relationships (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id            uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  person_id            uuid NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  heat_level           heat_level,
  relationship_type    text,
  how_we_met           text,
  notes                text,
  last_contact_date    date,
  follow_up_reminder   date,
  created_from_credit  boolean NOT NULL DEFAULT false,
  email                text,
  phone                text,
  agent_rep_info       text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CREATE UNIQUE INDEX uq_relationships_client_person
  ON relationships (client_id, person_id)
  WHERE deleted_at IS NULL;

CREATE TABLE reels (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  genre_label   text NOT NULL,
  url           text NOT NULL,
  notes         text,
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE awards (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  award_body   text NOT NULL,
  category     text NOT NULL,
  project_id   uuid REFERENCES projects(id) ON DELETE RESTRICT,
  result       award_result NOT NULL,
  year         integer NOT NULL,
  status       content_status NOT NULL DEFAULT 'draft',
  submitted_by submitted_by_type NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- ProWee Tables
-- ---------------------------------------------------------------------------

CREATE TABLE prowee_uploads (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_number integer NOT NULL,
  upload_date  date NOT NULL,
  pdf_url      text NOT NULL,
  processed_at timestamptz
);

CREATE TABLE prowee_listings (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id  uuid NOT NULL REFERENCES prowee_uploads(id) ON DELETE RESTRICT,
  title      text NOT NULL,
  format     text,
  platform   text,
  shoot_date text,
  location   text,
  raw_json   jsonb
);

CREATE TABLE prowee_matches (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id           uuid NOT NULL REFERENCES prowee_listings(id) ON DELETE RESTRICT,
  person_id            uuid NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  client_id            uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  relationship_id      uuid NOT NULL REFERENCES relationships(id) ON DELETE RESTRICT,
  heat_level_at_match  heat_level NOT NULL,
  recommended_action   text
);

-- ---------------------------------------------------------------------------
-- Triggers — auto-update updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_awards_updated_at
  BEFORE UPDATE ON awards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
