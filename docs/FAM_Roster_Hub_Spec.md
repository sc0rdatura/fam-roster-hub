# FAM Roster Hub — Project Specification
**Version:** 4.4
**Date:** April 2026
**Owner:** FAM (First Artists Management)
**Status:** Final — approved for Supabase migration SQL
**v4.1 fix:** Added `deleted_at` to PROJECT_PEOPLE and PROJECT_COMPANIES.
**v4.2 addition:** Added client profile fields from onboarding document:
base_locations, nationalities, primary_tax_territory,
secondary_tax_territory, manager_name, manager_email.
**CHANGES IN v4.4:**
Section 2: added "Authentication" subsection documenting email/password auth, manual admin creation via Supabase dashboard, public signup disabled, and the user_roles table as the role assignment mechanism.

---

## 1. Project Overview

The FAM Roster Hub is a web application for FAM, a music-for-visual-media
agency representing composers, music supervisors, and music editors. It
replaces a fragmented system of manually maintained Word documents,
spreadsheets, and ad-hoc emails with a centralised platform for managing:

- Client profiles, credits, and media assets
- On-demand bio and CV document generation
- Industry relationship tracking
- Intelligent project-matching against Production Weekly (Phase 3)

The system is internal and client-facing only. It is not a public-facing
agency website.

---

## 2. User Roles

| Role | Count | Capabilities |
|---|---|---|
| **Admin** | ~8-12 (not fixed) | Full read/write across all profiles; approve and publish credits, bios, and awards; access all relationship data; run intelligence reports |
| **Client** | ~100 | Own profile only; submit credits and awards for admin approval; manage own relationships (private); view own relationship list |

Role-based access via Supabase Row Level Security (RLS). Admin count is
not fixed; roles are assigned dynamically.

**Content publishing rules:**
- Credits and awards submitted by clients have status `draft` until an
  admin publishes them.
- Reel links are client-editable without approval.
- Bio text is provided by clients (professionally written). Admins edit
  and approve. The system stores and manages bios; it does not generate them.
- Relationships are never public. Visible only to the owning client and
  to admins.
- Admins can create and publish credits and awards directly.

### Authentication

Email/password only. No OAuth, no magic links.

| Concern | Implementation |
|---|---|
| Auth provider | Supabase Auth (email/password via `signInWithPassword`) |
| Role storage | `user_roles` table: links `auth.users.id` to `role` enum (admin, client) and optional `client_id` FK |
| Role lookup | `get_user_role()` Postgres function (SECURITY DEFINER, STABLE); used in all RLS policy definitions |
| Admin account creation | Manual via Supabase dashboard. No invite flow or admin-creation UI in Phase 1. |
| Client account creation | Phase 2 scope. `client_id` FK on `user_roles` links a client-role user to their `clients` record. |
| Public signup | Disabled in Supabase dashboard. Must be re-evaluated in Phase 2 for client invite flow. |
| Session management | React `AuthContext` subscribes to `onAuthStateChange` for reactive session state. |
| RLS enforcement | Phase 1: admin full access on all tables; authenticated read on lookup tables; self-read on `user_roles`. Client-scoped policies deferred to Phase 2. |
---

## 3. Build Phases

### Phase 1: Roster CMS

Core database, import pipeline, and admin tooling. The foundation
everything else depends on. Must be completed and well-populated before
Phase 3 produces reliable output.

**First build task:** Write the Supabase migration SQL from this spec
before scaffolding any UI. The migration is the source of truth for the
data model. If the scaffold generates its own schema, reconcile to the
migration, not the other way round.

**Second build task:** Build the CSV bulk import pipeline before building
data-entry UI. Populating ~100 clients' credits manually through a UI
is weeks of admin work. The import schema must be mapped against real
FAM spreadsheet data and confirmed with FAM before the build session
begins, not during it. See Section 4.2.

**Scope:**
- Client profiles with all media assets
- Structured credits with controlled vocabularies, linked People and
  Companies databases, and search-before-create deduplication
- CV and bio document generator (template-based PDF; no AI for core output)
- Relationship tracking module
- CSV bulk import pipeline for initial data population
- CSV export of People table for Optimiser contact import

### Phase 2: Client Portal + PitchGen

Authentication layer, client-facing interface, and first AI-powered
feature.

**Scope:**
- Secure login for ~100 clients
- Client view: own profile, credits (submit for approval), relationships
- Admin view: full roster management dashboard
- PitchGen: context-aware pitch bio. Requires Phase 1 relationship data
  to be populated before it produces useful output. See Section 5.3.

### Phase 3: Intelligence Layer

AI-powered weekly project-matching engine. Cannot begin until Phase 1
data is well-populated. ProWee table schema is defined in the Phase 1
migration even though the feature is built later. See Section 4.1.

**Scope:**
- Manual PDF upload of Production Weekly (weekly)
- Parser extracts per-project people and companies, matched against the
  shared People database
- Prioritised match report generation, persisted to database

---

## 4. Core Data Model

### 4.1 Tables

---

**CLIENTS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| full_name | text | |
| role_type | enum | Composer, Music Supervisor, Music Editor, Other |
| headshot_url | text | Single primary photo; drag-and-drop upload |
| press_photo_urls | array | Additional press images |
| imdb_url | text | Optional |
| website_url | text | Optional |
| bio_full | text | Published bio. Stored as sanitised HTML. Allowed tags: `<p>` `<strong>` `<em>` `<br>` only. Provided by client; edited and approved by admin. Never AI-generated. |
| bio_full_draft | text | Working version pending approval. Same HTML constraints. |
| bio_short | text | 2-3 sentence pitch bio (published). Plain text only. |
| bio_short_draft | text | Draft version. |
| bio_status | enum | draft, published |
| base_locations | array | Countries where the client is currently based or regularly works. Multiple values permitted (e.g. United States, United Kingdom). UI: multi-select country dropdown from ISO country list. Not free text. |
| nationalities | array | One or more nationalities. UI: multi-select country dropdown. Not free text. |
| primary_tax_territory | text | Country of primary tax residency. UI: single-select country dropdown. Not free text. |
| secondary_tax_territory | text | Optional secondary tax territory. UI: single-select country dropdown. |
| manager_name | text | Optional. Client's manager name for internal reference. |
| manager_email | text | Optional. |
| is_active | boolean | Currently on roster. See deactivation rules in Section 6. |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via Supabase trigger on any row change |
| deleted_at | timestamp | Soft delete. Null = active. Never hard-delete client records. |

**Bio versioning:** Two-slot model (published + draft) is sufficient for
UI purposes. Full history preserved via Supabase audit logging enabled
at the database level.

**Rich text editor:** Use Tiptap (React-compatible). Configure to allow
only `<p>` `<strong>` `<em>` `<br>`. Sanitise HTML on save before
writing to the database. The PDF renderer must support the same four
tags and no others.

---

**PROJECT_SUBTYPES** (lookup table, admin-extendable)

| value | display_label |
|---|---|
| short | Short |
| documentary | Documentary |
| limited_series | Limited Series |
| commercial | Commercial |
| telefilm | Telefilm |

Admins can add values. Used on PROJECTS.sub_type. Values are display
labels only and are not used for grouping, filtering, or matching logic.

---

**PROJECTS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | text | |
| category | enum | Film, TV, Games, Theatre, Other |
| sub_type | FK: PROJECT_SUBTYPES | Optional. Display label only; not used for grouping or matching. |
| year_start | integer | Optional. Start year, or sole year for single-year projects. |
| year_end | integer | Optional. End year for multi-year projects (e.g. a TV series). |
| status | enum | In Production. Optional. Null by default. Only "In Production" appears on CV output. "Released" is implied by a published credit and never displayed. "Development" is not a valid status for display. |
| imdb_url | text | Optional |
| external_url | text | Optional |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |
| deleted_at | timestamp | Soft delete |

**Unique constraint:** Partial unique index on `(title, category)` where
`deleted_at IS NULL`. Enforced at the database level, not only in the UI.
The import script must handle conflicts explicitly: log duplicates,
do not silently create them.

**Year display logic in CV output:**

| year_start | year_end | status | Displayed as |
|---|---|---|---|
| Set | Not set | Any | "2023" |
| Set | Set | Any | "2023-2026" |
| Not set | Not set | In Production | "In Production" |
| Not set | Not set | Null | (blank) |

**Distributor/network:** Stored via PROJECT_COMPANIES with role `Network`
or `Distributor`. Not a separate field on PROJECTS.

**Deduplication workflow:** When a user begins typing a project title,
existing matches surface (search-before-create). The user selects an
existing record or explicitly confirms they are creating a new one.
Duplicate merging is a future feature; prevent duplicates at entry.

---

**CREDIT_ROLES** (lookup table, admin-extendable)

| value | display_label |
|---|---|
| composer | Composer |
| additional_music | Additional Music |
| music_editor | Music Editor |
| music_supervisor | Music Supervisor |
| score_producer | Score Producer |

New values can be added by admins as edge cases arise. The import script
must map all existing client credit designations to one of these values
before the import runs; unmapped values must be flagged for admin review,
not silently dropped or defaulted.

---

**CREDITS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK: CLIENTS | |
| project_id | FK: PROJECTS | |
| role | FK: CREDIT_ROLES | Must match a value in CREDIT_ROLES |
| status | enum | draft, published |
| submitted_by | enum | admin, client |
| internal_notes | text | Admin-only. Never shown on profile or CV output. |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |
| deleted_at | timestamp | Soft delete |

**Unique constraint:** Partial unique index on `(client_id, project_id)`
where `deleted_at IS NULL`. One credit record per client-project pairing.

Credits are created automatically as a by-product of project entry.
Users do not interact with the CREDITS table directly.

---

**PROJECT_PEOPLE_ROLES** (lookup table, admin-extendable)

| value | display_label |
|---|---|
| director | Director |
| producer | Producer |
| showrunner | Showrunner |
| creator | Creator |

If a person holds two roles on a project (e.g. director and producer),
they appear as two separate PROJECT_PEOPLE records, one per role.

---

**PEOPLE**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| full_name | text | Canonical name used for matching |
| name_variants | array | Alternative spellings and nicknames. Maintained by admins. Phase 3 will surface failed matches as candidate variant suggestions. |
| primary_role | text | **Free text. Display only. Must not be used in queries that depend on consistent values.** Use PROJECT_PEOPLE.role_on_project for structured role data. |
| company_id | FK: COMPANIES | Optional current primary company |
| email | text | Optional |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |
| deleted_at | timestamp | Soft delete. Hard delete must be blocked if the record is referenced by active credits or relationships. |

**CSV export:** Full People table export supported. Used for bulk contact
import into Optimiser before API integration is live.

**Phase 3 match quality note:** `name_variants` will be sparse at Phase 1
launch. Phase 3 matching will initially rely primarily on exact name
matching. Match quality improves over time as variants are added,
either manually by admins or via Phase 3 failed-match suggestions.
The first weeks of ProWee reports will have lower recall than the
current manual process. This is expected and not a defect.

---

**COMPANIES**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | text | Canonical name |
| name_variants | array | Alternative names for matching |
| type | enum | Production Company, Studio, Network, Streamer, Agency, Other |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |
| deleted_at | timestamp | Soft delete |

---

**PROJECT_PEOPLE**

Links People to Projects in specific roles. Populated via credit entry
autocomplete.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| project_id | FK: PROJECTS | |
| person_id | FK: PEOPLE | |
| role_on_project | FK: PROJECT_PEOPLE_ROLES | Must match a value in PROJECT_PEOPLE_ROLES |
| deleted_at | timestamp | Soft delete. Required for the partial unique constraint below. |

**Unique constraint:** Partial unique index on
`(project_id, person_id, role_on_project)` where `deleted_at IS NULL`.
A person cannot be listed in the same role on the same project twice.

---

**PROJECT_COMPANIES**

Links Companies to Projects. All distributor, studio, and production
company associations live here.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| project_id | FK: PROJECTS | |
| company_id | FK: COMPANIES | |
| role | enum | Production Company, Studio, Network, Distributor, Other |
| deleted_at | timestamp | Soft delete. Required for consistency with the rest of the schema. |

---

**RELATIONSHIPS**

Each client's private network. Never publicly visible.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK: CLIENTS | |
| person_id | FK: PEOPLE | |
| heat_level | enum | Cold, Warm, Hot, Direct Collaborator |
| relationship_type | text | Free text. Personal context; not used for grouping or matching. |
| how_we_met | text | Free text |
| notes | text | Free text, client-visible and editable |
| last_contact_date | date | Optional |
| follow_up_reminder | date | Optional, future feature hook |
| created_from_credit | boolean | True if auto-generated from a credit entry |
| email | text | Optional |
| phone | text | Optional |
| agent_rep_info | text | Optional free text |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |

**Unique constraint:** Partial unique index on `(client_id, person_id)`
where `deleted_at IS NULL`. At most one relationship record between a
given client and a given person. Required for auto-creation merge logic
to behave correctly.

**UI:** Progressive disclosure. Name, Role, Heat Level, and Notes shown
by default. All other fields behind "Add more details" toggle.

**Auto-creation merge rules on credit publication:**

| Scenario | Action |
|---|---|
| No relationship exists | Create: `heat_level = Direct Collaborator`, `created_from_credit = true` |
| Relationship exists at Cold, Warm, or Hot | Upgrade `heat_level` to Direct Collaborator. Preserve all existing notes. Set `created_from_credit = true`. |
| Relationship already at Direct Collaborator | No change. Optionally update `updated_at`. |
| Credit is unpublished or deleted after relationship was created | No change to relationship. Relationships are historical facts and do not revert. |

---

**CLIENT_COMPANY_RELATIONSHIPS**

Tracks direct client-to-company relationships independent of credit
history. Credit-derived company connections are already queryable via
CREDITS → PROJECT_COMPANIES → COMPANIES; this table captures
relationships that exist without a corresponding credit (e.g. meetings,
warm contacts, agency connections).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK: CLIENTS | |
| company_id | FK: COMPANIES | |
| heat_level | enum | Cold, Warm, Hot, Direct Collaborator |
| notes | text | Optional free text |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated via trigger |
| deleted_at | timestamp | Soft delete |

**Unique constraint:** Partial unique index on `(client_id, company_id)`
where `deleted_at IS NULL`.

**Phase 3 note:** A dedicated `prowee_company_matches` table, if needed
for company-level ProWee matching, is deferred to Phase 3 when
requirements are clearer.

---

**REELS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK: CLIENTS | |
| genre_label | text | e.g. Drama, Documentary, Action |
| url | text | Vimeo, YouTube, or other |
| notes | text | Optional |
| display_order | integer | For ordering on profile |

Client-editable without admin approval.

---

**AWARDS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | FK: CLIENTS | |
| award_body | text | e.g. BAFTA, Tony Award, Emmy |
| category | text | e.g. Best Original Score |
| project_id | FK: PROJECTS | Optional link to a credit |
| result | enum | Won, Nominated |
| year | integer | |
| status | enum | draft, published |
| submitted_by | enum | admin, client |

Awards require admin approval before appearing on profiles or CV output.
Same draft/published gate as credits.

---

**FILE UPLOAD CONSTRAINTS**

Applies to headshots and press photos:
- Accepted formats: JPEG, PNG, WebP
- Maximum file size: 5MB per file
- Auto-resized on upload to maximum 2000px on longest edge
- Storage: Supabase Storage, paths `clients/{client_id}/headshot` and
  `clients/{client_id}/press/`

---

**ProWee Tables**

Defined in Phase 1 migration. UI and parser built in Phase 3 only.
Defined now because they reference Phase 1 tables (PEOPLE, CLIENTS,
RELATIONSHIPS), and adding them later would require schema changes to
existing queries.

**PROWEE_UPLOADS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| issue_number | integer | e.g. 1494 |
| upload_date | date | |
| pdf_url | text | Supabase Storage path |
| processed_at | timestamp | Null until parsing is complete |

**PROWEE_LISTINGS**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| upload_id | FK: PROWEE_UPLOADS | |
| title | text | Project title as extracted |
| format | text | e.g. Feature Film, Series, Pilot |
| platform | text | e.g. Netflix, HBO |
| shoot_date | text | Raw extracted value; may be a date, month, or range |
| location | text | Optional |
| raw_json | jsonb | Full extracted data for this listing |

**PROWEE_MATCHES**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| listing_id | FK: PROWEE_LISTINGS | |
| person_id | FK: PEOPLE | The matched person |
| client_id | FK: CLIENTS | The FAM client with a relationship to this person |
| relationship_id | FK: RELATIONSHIPS | The specific relationship record |
| heat_level_at_match | enum | Snapshot of heat level at time of match. Not a live reference. |
| recommended_action | text | e.g. "Flag to [client name]" |

---

### 4.2 Bulk Import Schema

Initial population of ~100 clients' data must use an import script.
Building the import script is the second task after migration SQL.

**This work must happen before the build session begins, not during it.**
The build session should execute an agreed schema, not design one. Before
the session: take at least one real client's spreadsheet, map its columns
to the import targets below, and confirm the mapping with FAM. Bring
the confirmed mapping and sample data to the session.

**Source document format:** FAM credit and project data is currently
held in Word-format CVs and credit lists, not structured spreadsheets.
The planned ingestion approach is an LLM-assisted conversion pipeline
(separate build, outside the Hub) that transforms these documents into
structured spreadsheets conforming to the import schema below. The
import script and target schema defined in this section remain valid;
only the upstream source preparation changes.

**Minimum import targets:**

| Target | Key columns |
|---|---|
| CLIENTS | full_name, role_type |
| PROJECTS | title, category, sub_type, year_start, year_end, status |
| CREDITS | client full_name + project title + role (joined row) |
| PEOPLE | full_name, primary_role |
| RELATIONSHIPS | client full_name + person full_name + heat_level + notes + last_contact_date |

**Reference format:** Logan Nelson Client Hub spreadsheet (Contacts tab:
Name, Position/Company, Relationship/Notes, Contact Info, Last Check-In).
This is the closest existing FAM data format to the RELATIONSHIPS import
target.

**Import constraints:**
- All `role` values in the CREDITS import must map to a value in
  CREDIT_ROLES. Unmapped values must be flagged for admin review, not
  silently dropped or defaulted to a catch-all.
- Duplicate projects (same title + category) must be flagged in the
  import log, not silently created.

---

## 5. Feature Specifications

### 5.1 Credit Entry with Autocomplete

1. Search existing projects first (search-before-create). Matching
   suggestions surface as the user types the title.
2. If a match exists, select it. If not, create a new PROJECT record.
3. Add People: type a name, get autocomplete from PEOPLE table. Select
   existing or create new. Assign a role from PROJECT_PEOPLE_ROLES.
4. Add Companies: same autocomplete from COMPANIES.
5. Set the client's role from CREDIT_ROLES.
6. Optionally: IMDb link, project status, internal notes.
7. Submit for approval (client) or publish directly (admin).

On publication, auto-create or update RELATIONSHIPS records per the
merge rules in Section 4.1.

### 5.2 CV and Bio Document Generator

Template-based document assembly. No AI required for core output.
Equivalent to how accounting software generates an invoice: pull
structured data, inject into a fixed template, render to PDF.

**Output formats:**

| Format | Method |
|---|---|
| Full CV | FAM branded PDF template (design TBD). Client name, published bio, credits grouped by category and sorted by year_start descending, awards. |
| Credit list only | Credits filtered by category or all, sorted by year_start descending. No bio prose. |
| Short pitch bio | Optional AI-assisted shortening of the published full bio to 2-3 sentences. Not default; triggered explicitly by admin. |

**Template:** FAM house template to be designed separately before this
feature is built. Design brief is a pending action item.

**Bio handling:**
- Full bios pasted into `bio_full` via Tiptap editor
- Admins may edit and trim before publishing
- Bios should not exceed one page in generated PDF
- Rich text formatting (bold, italic) preserved in PDF output
- System manages and formats bios; it never generates them

**Credit display rules:**
- All categories use the same collaborator fields: Director, Producer,
  Showrunner, Creator
- Games credits may use "Studio" as a display label in place of
  Production Company where appropriate
- Theatre and Games use the same underlying data model; category-specific
  collaborator fields deferred to a future release
- sub_type label displayed after project title if set
- "In Production" displayed if status is set, per the year display logic
  table in Section 4.1

### 5.3 PitchGen (Phase 2 Only)

Cannot be built until Phase 1 relationship data is populated.

Admin selects a client and enters a target context (project title,
director, producer, platform, or genre). System checks the client's
relationship graph and credit history for matches against the entered
names. AI generates a 2-3 sentence bio that leads with the most
relevant credits and references prior relationships where they exist.
Output is plain text, copy-ready.

### 5.4 Relationship Manager

Private to each client and admins. Never shown on profiles or CV output.

Progressive disclosure UI: Name, Role, Heat Level, Notes shown by
default. Full fields on toggle.

Client view: own relationships, sorted by heat level descending. Can
add and edit. Can see which were auto-created from credits.

Admin view: all relationships for any client.

### 5.5 Client Profile Page

Internal and client-facing only. No public URL for external sharing.
Future Webflow integration (out of scope) may pull from Hub data via
API for public-facing artist pages.

Displays: name, role type, headshot, published bio, awards, credit list
(filterable by category), reel links by genre, press photos, IMDb link,
website link.

Never shown: relationships, internal credit notes, draft content.

---

## 6. Client Deactivation Rules

When `deleted_at` is set or `is_active = false`:

| Surface | Behaviour |
|---|---|
| Roster list and admin dashboard | Hidden from active views; visible via filter toggle |
| Their credits in the database | Retained. Historical facts. |
| Their profile and CV generation | Disabled |
| Their People and Relationships data | Retained in database. Excluded from Phase 3 ProWee matching. Not shown in relationship visualisations. |
| Reactivation | Full restore. No data loss. |

---

## 7. Phase 3: Intelligence Layer

### 7.1 How It Works

1. Admin uploads Production Weekly PDF (manual, weekly).
2. Parser extracts per listing: title, format, platform, shoot date,
   location, and all named people with labelled roles. Target fields
   confirmed from Issue #1494 review: `PRODUCER:`, `DIRECTOR:`,
   `SHOWRUNNER:`, `WRITER/PRODUCER:`, `WRITER/DIRECTOR:`. Names are
   dash-separated within each field.
3. Extracted names matched against PEOPLE table. Exact match on
   `full_name` first; fuzzy match on `name_variants` second.
4. For each match, find CLIENTS with a RELATIONSHIPS record linked to
   that Person.
5. Generate and persist match report via PROWEE_MATCHES records.

**Match quality:** Will improve over time as `name_variants` are
populated. Initial weeks will rely primarily on exact name matching.
This is expected behaviour, not a defect.

### 7.2 Report Output

Sorted by `heat_level_at_match` descending:
- **High:** Direct Collaborator or Hot
- **Medium:** Warm
- Cold: informational, optional inclusion

Each entry: project title, platform, shoot date, matched person and
their role, client name(s), relationship notes, recommended action.

Report format mirrors current manual ProWee reports (reference:
Issue #1494, March 2026).

### 7.3 PDF Format Confirmed

Production Weekly Issue #1494 (33 pages, March 2026) reviewed. Format
is consistent: every listing uses labelled fields with dash-separated
name lists. Extraction approach confirmed viable.

An existing standalone extractor (Google AI Studio / GitHub, no
database) confirms the approach works in practice. Phase 3 rebuilds
this logic inside the Hub with Supabase connectivity. The standalone
tool continues operating independently for its current weekly use.

---

## 8. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Database / Auth / Storage | Supabase (PostgreSQL) | Relational model; RLS for access control; audit logging for bio history; Storage for file uploads |
| Front end | React + TypeScript | |
| Build tool | Vite | React + TypeScript template; `VITE_` prefix required for browser-exposed env vars |
| Styling | Tailwind CSS | Utility-first CSS; design tokens customisable via `tailwind.config.ts` |
| Component library | shadcn/ui | Pre-built accessible React components (tables, forms, dialogs); installed on top of Tailwind |
| Rich text editor | Tiptap | Constrained to `<p>` `<strong>` `<em>` `<br>` only |
| Hosting | Vercel | |
| AI (pitch bio shortening, Phase 3 parser) | Anthropic API (Claude Sonnet) | Selective use only. Not used for template-based generation. |
| Initial scaffold | Cursor | Scaffolded with Vite directly in Cursor. AI Studio step skipped; repo was already established before UI build began. |
| Ongoing development | Cursor | Claude-native, VS Code-based agent mode. Reads full codebase. User has existing VS Code familiarity. |
| Fallback scaffold option | Antigravity | VS Code skin, Gemini-based. Option if AI Studio proves insufficient. |
| Code repository | GitHub | |
| Build co-pilot | Claude Project (Opus) | Spec keeper, architecture advisor, Cursor task generator. |

**Tooling order of operations:**
1. Write Supabase migration SQL from this spec
2. Map and confirm bulk import schema against real FAM data
3. Build CSV import script
4. Scaffold UI directly in Cursor
5. Connect Supabase manually
6. All further development in Cursor

---

## 9. CRM Integration (Optimiser)

**API status: Confirmed.** Optimiser Touchpoint has a documented API
supporting contact management and third-party integration.

**Integration direction:** Hub pushes to Optimiser. Optimiser handles
outreach and workflow. The Hub handles intelligence and content.

**Near-term bridge:** CSV export of People table enables bulk contact
import into Optimiser without API dependency.

**Phase 2+ API integration:** Person records pushed to Optimiser on
creation or update. ProWee match flags can optionally create Optimiser
pipeline tasks.

**Action item:** Obtain Optimiser API credentials and documentation.
Confirm which objects (contacts, tasks, pipeline) are API-accessible
and what authentication method is required.

---

## 10. Decisions Log

| Date | Decision | Reason | Impact |
|---|---|---|---|
| March 2026 | Supabase over Firebase | Relational model required for graph-heavy data | All Phase 3 matching depends on this |
| March 2026 | Shared deduplicated PEOPLE table | Enables cross-client Phase 3 matching | Every credit entry resolves to a canonical People record |
| March 2026 | Controlled vocabularies for all role fields that drive logic | Prevents data rot; CV grouping requires consistency | CREDIT_ROLES and PROJECT_PEOPLE_ROLES lookup tables; admin-extendable |
| March 2026 | primary_role on PEOPLE is free text | Display only; not used for grouping or matching | Must not be used in queries expecting consistent values |
| March 2026 | sub_type on PROJECTS is a lookup table | Prevents "Documentary" vs "Doc" inconsistency appearing on CV output | PROJECT_SUBTYPES lookup table; admin-extendable |
| March 2026 | HTML with constrained tag set for bio_full | Tiptap; sanitise on save; PDF renderer must match | Allowed tags: `<p>` `<strong>` `<em>` `<br>` only |
| March 2026 | Project dedup key: title + category, enforced as partial unique index | Year excluded because projects span years or lack confirmed date; database-level enforcement prevents import script bypassing UI | Import must handle conflicts explicitly |
| March 2026 | year_start + year_end integers replace single year field | Projects span years; some have TBC date | CV display logic defined explicitly in Section 4.1 |
| March 2026 | network_distributor removed; normalised into PROJECT_COMPANIES | Prevents drift between free text and Companies table | All networks/distributors via PROJECT_COMPANIES |
| March 2026 | Unique constraints on CREDITS, PROJECT_PEOPLE, RELATIONSHIPS | Prevents silent duplicate creation from import bugs or race conditions | Partial unique indexes on all three; import script must respect them |
| March 2026 | Supabase audit logging for bio history | Two-slot model sufficient for UI | No separate BIO_VERSIONS table required |
| March 2026 | Soft delete (deleted_at) on all core tables | Hard deletes break referential integrity silently | All core tables have deleted_at; hard delete blocked on referenced records |
| March 2026 | updated_at on all tables | Required for Optimiser sync and debugging | Auto-set via Supabase trigger on every row change |
| March 2026 | ProWee tables defined in Phase 1 migration | Reference Phase 1 entities; later addition requires schema changes | No UI or parser built until Phase 3 |
| March 2026 | Awards require admin approval; reels do not | Awards are factual claims on professional CVs | Awards follow same draft/published flow as credits |
| March 2026 | Relationship merge rules: upgrade only, never downgrade; unpublish does not revert | Relationships are historical facts | Defined explicitly to prevent ambiguous developer decisions |
| March 2026 | Unique constraint on RELATIONSHIPS (client_id + person_id) | Merge rules assume at most one record per pair; race conditions otherwise create duplicates | Partial unique index enforces this at database level |
| March 2026 | Deactivated clients: data retained, excluded from Phase 3 and visualisations | Historical data must not be destroyed | is_active and deleted_at gate matching and display; data untouched |
| March 2026 | Import schema must be confirmed before build session, not during | Build session should execute, not design | Minimum: one real client's data mapped and reviewed before session |
| March 2026 | Migration SQL written before UI scaffold | Scaffold may generate its own schema; database is source of truth | Cursor generates migration from this spec |
| March 2026 | Bulk import pipeline built before data-entry UI | ~100 clients cannot be entered manually | Import schema maps to existing FAM spreadsheet formats |
| March 2026 | No Lovable; AI Studio + Cursor toolchain | Lovable uses Gemini models accessible free in AI Studio | Manual Supabase connection required after export |
| March 2026 | No public profile URL in Hub | Webflow handles public artist pages | Future: Webflow pulls from Hub via API |
| March 2026 | PitchGen in Phase 2, not Phase 1 | Depends on Phase 1 relationship data being populated | Phase 1 builds the data foundation |
| March 2026 | CV generator is template-based, not AI | Deterministic assembly; AI adds cost without value here | AI used only for optional pitch bio shortening |
| March 2026 | Credits created as by-product of project entry | Users never interact with CREDITS table directly | Project entry creates PROJECT and CREDITS simultaneously |
| March 2026 | Optimiser API confirmed; integration viable | Verified via Optimiser Touchpoint documentation | Next: obtain API credentials from account manager |
| April 2026 | Added `client_company_relationships` table as migration 00002 | Clients may have meaningful company relationships not reflected in credit history; these had no home in the schema | Purely additive; no existing tables changed; `prowee_company_matches` deferred to Phase 3 |
| April 2026 | UI scaffold built directly in Cursor rather than AI Studio | Repo already existed before UI build began; AI Studio export step was unnecessary overhead | Section 8 tooling order and tech stack table updated accordingly |
| April 2026 | LLM-assisted conversion pipeline planned for Word-format credit and project data ingestion | Source documents are Word files, not structured spreadsheets; LLM conversion is more efficient than manual entry or a bespoke parser | Separate build outside the Hub; import schema in Section 4.2 remains the target format |

---

## 11. Open Questions and Action Items

| Item | Owner | Priority | Status |
|---|---|---|---|
| Map bulk import schema against at least one real client spreadsheet; confirm with FAM before build session | FAM + build session | High — blocks Phase 1 import build | Pending |
| Obtain Optimiser API credentials and documentation | FAM | Medium | Pending |
| Confirm which Optimiser objects are API-accessible | FAM | Medium | Pending |
| Brief FAM house template design for CV/bio PDF output | FAM | Medium — blocks CV generator build | Pending |
| Provide sample CV output per category (Film, TV, Games, Theatre) as template test cases | FAM | Medium | Pending |
| Review migration SQL before first deploy | Build session | High — first build task | Pending |
