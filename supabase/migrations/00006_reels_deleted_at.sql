-- T11 decision (Option A): add deleted_at to reels for consistency with other tables
ALTER TABLE reels ADD COLUMN deleted_at timestamptz DEFAULT NULL;
