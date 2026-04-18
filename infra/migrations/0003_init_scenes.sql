-- MQuill v1: Migration 0003 - Initialize Scenes
-- Creates scene_cards table (depends on chapters table)

-- Scene cards table
CREATE TABLE scene_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    viewpoint_character_id UUID,
    goal TEXT,
    conflict TEXT,
    expected_outcome TEXT,
    source VARCHAR(16) NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'hybrid')),
    status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'generated', 'discarded')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scene_cards
CREATE INDEX idx_scene_cards_chapter_id ON scene_cards(chapter_id);
CREATE INDEX idx_scene_cards_chapter_sort ON scene_cards(chapter_id, sort_order);
CREATE INDEX idx_scene_cards_status ON scene_cards(status);
CREATE INDEX idx_scene_cards_project_id ON scene_cards(project_id);

-- Trigger for scene_cards
CREATE TRIGGER update_scene_cards_updated_at
    BEFORE UPDATE ON scene_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
