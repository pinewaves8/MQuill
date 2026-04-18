-- MQuill v1: Migration 0005 - Initialize Versions
-- Creates version_records table

-- Version records table
CREATE TABLE version_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (type IN ('autosave', 'manual', 'revision', 'branch', 'current')),
    source VARCHAR(64) NOT NULL,
    summary TEXT,
    parent_id UUID REFERENCES version_records(id) ON DELETE SET NULL,
    branch_name VARCHAR(120),
    snapshot_content TEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for version_records
CREATE INDEX idx_version_records_chapter_id ON version_records(chapter_id);
CREATE INDEX idx_version_records_created_at ON version_records(created_at DESC);
CREATE INDEX idx_version_records_chapter_created ON version_records(chapter_id, created_at DESC);
CREATE INDEX idx_version_records_is_current ON version_records(chapter_id, is_current) WHERE is_current = TRUE;
