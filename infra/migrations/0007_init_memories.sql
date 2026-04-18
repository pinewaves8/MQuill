-- MQuill v1: Migration 0007 - Initialize Memories
-- Creates memories table

-- Memories table (knowledge base for the project)
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    memory_type VARCHAR(24) NOT NULL CHECK (memory_type IN ('canon', 'world', 'narrative', 'style', 'user')),
    key VARCHAR(200) NOT NULL,
    content JSONB NOT NULL,
    priority INT NOT NULL DEFAULT 50,
    source VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'agent', 'system')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for memories
CREATE INDEX idx_memories_project_id ON memories(project_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_project_type ON memories(project_id, memory_type);
CREATE INDEX idx_memories_project_type_key ON memories(project_id, memory_type, key);

-- Unique constraint on project_id + memory_type + key
CREATE UNIQUE INDEX idx_memories_unique ON memories(project_id, memory_type, key);
