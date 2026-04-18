-- MQuill v1: Migration 0009 - Additional Performance Indexes
-- Creates additional indexes for common query patterns

-- Projects: status + updated_at for dashboard queries
CREATE INDEX idx_projects_status_updated ON projects(status, updated_at DESC);

-- Chapters: project_id + status for filtering
CREATE INDEX idx_chapters_project_status ON chapters(project_id, status);

-- Scene cards: composite index for chapter scene list with sorting
CREATE INDEX idx_scene_cards_chapter_status_sort ON scene_cards(chapter_id, status, sort_order);

-- Draft segments: composite index for locked segment queries
CREATE INDEX idx_draft_segments_locked ON draft_segments(chapter_id, is_locked);

-- Revision tasks: composite for issue-linked revisions
CREATE INDEX idx_revision_tasks_linked_issue ON revision_tasks(linked_issue_id) WHERE linked_issue_id IS NOT NULL;

-- Version records: for finding branch ancestors
CREATE INDEX idx_version_records_parent ON version_records(parent_id) WHERE parent_id IS NOT NULL;

-- Memories: for priority-based retrieval
CREATE INDEX idx_memories_priority ON memories(project_id, memory_type, priority DESC);

-- Agent runs: for recent runs by project
CREATE INDEX idx_agent_runs_created ON agent_runs(project_id, created_at DESC);
