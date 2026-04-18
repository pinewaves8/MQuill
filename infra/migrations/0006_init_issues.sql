-- MQuill v1: Migration 0006 - Initialize Issues
-- Creates evaluation_issues table

-- Evaluation issues table
CREATE TABLE evaluation_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    issue_type VARCHAR(32) NOT NULL CHECK (issue_type IN ('style', 'pacing', 'character', 'lore', 'timeline', 'clarity')),
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    title VARCHAR(200) NOT NULL,
    reason TEXT NOT NULL,
    location_ref VARCHAR(128),
    suggestion TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_revision', 'fixed', 'wont_fix')),
    linked_version_id UUID REFERENCES version_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for evaluation_issues
CREATE INDEX idx_evaluation_issues_chapter_id ON evaluation_issues(chapter_id);
CREATE INDEX idx_evaluation_issues_status ON evaluation_issues(status);
CREATE INDEX idx_evaluation_issues_severity ON evaluation_issues(severity);
CREATE INDEX idx_evaluation_issues_chapter_status ON evaluation_issues(chapter_id, status);
CREATE INDEX idx_evaluation_issues_chapter_status_severity ON evaluation_issues(chapter_id, status, severity);

-- Trigger for evaluation_issues
CREATE TRIGGER update_evaluation_issues_updated_at
    BEFORE UPDATE ON evaluation_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
