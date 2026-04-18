-- MQuill v1: Migration 0008 - Initialize Agent Runs
-- Creates agent_runs and retrieval_logs tables

-- Agent runs table
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    scene_id UUID REFERENCES scene_cards(id) ON DELETE SET NULL,
    agent_name VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(32) NOT NULL CHECK (trigger_type IN ('create_project', 'generate_scene', 'write', 'revise', 'evaluate', 'consistency', 'bootstrap')),
    input_payload JSONB NOT NULL,
    output_payload JSONB,
    status VARCHAR(24) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrieval logs table
CREATE TABLE retrieval_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    retriever_name VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    result_refs JSONB NOT NULL DEFAULT '[]',
    usefulness_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_runs
CREATE INDEX idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_agent_name ON agent_runs(agent_name);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_project_agent ON agent_runs(project_id, agent_name);
CREATE INDEX idx_agent_runs_project_status ON agent_runs(project_id, status);

-- Indexes for retrieval_logs
CREATE INDEX idx_retrieval_logs_project_id ON retrieval_logs(project_id);
CREATE INDEX idx_retrieval_logs_run_id ON retrieval_logs(run_id);
CREATE INDEX idx_retrieval_logs_retriever ON retrieval_logs(retriever_name);
