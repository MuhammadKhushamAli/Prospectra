-- Add source column to search_progress table to track which provider (apollo/tavily) was used
ALTER TABLE search_progress DROP CONSTRAINT search_progress_pkey;

ALTER TABLE search_progress
    ADD COLUMN source TEXT NOT NULL DEFAULT 'apollo' CHECK (source IN ('apollo', 'tavily'));

ALTER TABLE search_progress
    ADD PRIMARY KEY (org_id, skill_target_id, source);
