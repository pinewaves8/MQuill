-- MQuill v1: Migration 0002 - Initialize Chapters
-- Creates chapters and draft_segments tables

-- Chapters table
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_volume_id UUID,
    sort_order INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'drafting', 'revising', 'approved', 'done')),
    word_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Draft segments (supports partial locking and revision)
CREATE TABLE draft_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scene_cards(id) ON DELETE SET NULL,
    segment_index INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    source VARCHAR(16) NOT NULL DEFAULT 'manual' CHECK (source IN ('ai', 'manual', 'hybrid')),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chapters
CREATE INDEX idx_chapters_project_id ON chapters(project_id);
CREATE INDEX idx_chapters_project_sort ON chapters(project_id, sort_order);
CREATE INDEX idx_chapters_status ON chapters(status);

-- Indexes for draft_segments
CREATE INDEX idx_draft_segments_chapter_id ON draft_segments(chapter_id);
CREATE INDEX idx_draft_segments_chapter_index ON draft_segments(chapter_id, segment_index);
CREATE INDEX idx_draft_segments_scene_id ON draft_segments(scene_id);

-- Trigger for chapters
CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for draft_segments
CREATE TRIGGER update_draft_segments_updated_at
    BEFORE UPDATE ON draft_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
