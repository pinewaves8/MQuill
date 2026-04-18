-- MQuill v1: Migration 0004 - Initialize Revisions
-- Creates revision_tasks and revision_candidates tables

-- Revision tasks table
CREATE TABLE revision_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    target_scope VARCHAR(24) NOT NULL DEFAULT 'selection' CHECK (target_scope IN ('selection', 'segment', 'chapter')),
    target_ref_id UUID,
    suggestion TEXT NOT NULL,
    goals JSONB NOT NULL DEFAULT '[]',
    constraints JSONB NOT NULL DEFAULT '[]',
    apply_mode VARCHAR(16) NOT NULL DEFAULT 'replace' CHECK (apply_mode IN ('replace', 'append', 'branch')),
    status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'reviewed', 'applied', 'rejected')),
    linked_issue_id UUID,
    created_by VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (created_by IN ('user', 'agent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revision candidates table
CREATE TABLE revision_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_task_id UUID NOT NULL REFERENCES revision_tasks(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    candidate_text TEXT NOT NULL,
    diff_payload JSONB,
    score NUMERIC(5,2),
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for revision_tasks
CREATE INDEX idx_revision_tasks_chapter_id ON revision_tasks(chapter_id);
CREATE INDEX idx_revision_tasks_status ON revision_tasks(status);
CREATE INDEX idx_revision_tasks_chapter_status ON revision_tasks(chapter_id, status);
CREATE INDEX idx_revision_tasks_linked_issue ON revision_tasks(linked_issue_id);

-- Trigger for revision_tasks
CREATE TRIGGER update_revision_tasks_updated_at
    BEFORE UPDATE ON revision_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
