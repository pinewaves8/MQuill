-- MQuill v1: Migration 0001 - Initialize Projects
-- Creates projects, project_tags, and project_charters tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    book_type VARCHAR(32) NOT NULL CHECK (book_type IN ('novel', 'short', 'series', 'nonfiction', 'poetry')),
    target_length VARCHAR(16) NOT NULL CHECK (target_length IN ('short', 'mid', 'long')),
    language VARCHAR(16) NOT NULL DEFAULT 'zh',
    mode VARCHAR(16) NOT NULL CHECK (mode IN ('auto', 'co_create', 'author_driven')),
    status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'bootstrapping', 'active', 'paused', 'completed', 'archived')),
    description TEXT,
    cover_tone VARCHAR(32),
    viewpoint VARCHAR(32),
    target_audience VARCHAR(64),
    style_keywords JSONB NOT NULL DEFAULT '[]',
    word_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project tags
CREATE TABLE project_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag VARCHAR(64) NOT NULL
);

-- Project charters (creative brief/mission statement)
CREATE TABLE project_charters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    theme TEXT,
    core_conflict TEXT,
    target_audience VARCHAR(64),
    viewpoint VARCHAR(32),
    style_keywords JSONB NOT NULL DEFAULT '[]',
    forbidden_rules JSONB NOT NULL DEFAULT '[]',
    writing_goals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for projects
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_tags_project_id ON project_tags(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for projects
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for project_charters
CREATE TRIGGER update_project_charters_updated_at
    BEFORE UPDATE ON project_charters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
