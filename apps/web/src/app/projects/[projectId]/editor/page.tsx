'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEditorStore } from '@/lib/state/editor-store';
import { useSceneStore } from '@/lib/state/scene-store';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { ScenePanel } from '@/components/layout/scene-panel';
import { EditorHeader } from '@/components/layout/editor-header';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { RevisionModal } from '@/components/editor/revision-modal';
import { SelectionToolbar } from '@/components/editor/selection-toolbar';
import { EvaluationPanel } from '@/components/editor/evaluation-panel';
import { ProjectOverview } from '@/components/project/project-overview';
import { OutlineView } from '@/components/project/outline-view';
import { VersionHistoryDrawer } from '@/components/version/version-history-drawer';
import { useRevisionStore } from '@/lib/state/revision-store';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const {
    project,
    chapters,
    currentChapter,
    draftSegments,
    setProjectId,
    setProject,
    setChapters,
    setCurrentChapter,
    setDraftSegments,
    setIsLoading,
  } = useEditorStore();

  const { setScenes, scenes } = useSceneStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const { isModalOpen, openModal } = useRevisionStore();
  const [isModalHydrated, setIsModalHydrated] = useState(false);
  const [leftTab, setLeftTab] = useState<'chapters' | 'outline' | 'versions' | 'evaluation'>(
    () => {
      const tab = searchParams.get('tab');
      if (tab === 'outline' || tab === 'versions' || tab === 'evaluation') {
        return tab;
      }
      return 'chapters';
    }
  );
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Handle evaluation tab
  useEffect(() => {
    if (leftTab === 'evaluation') {
      setShowEvaluation(true);
    }
  }, [leftTab]);

  // Handle versions tab
  useEffect(() => {
    if (leftTab === 'versions') {
      setShowVersionHistory(true);
    }
  }, [leftTab]);

  // Ensure modal only renders after hydration to prevent flicker
  useEffect(() => {
    setIsModalHydrated(true);
  }, []);

  // Fetch project and chapters
  useEffect(() => {
    setProjectId(projectId);
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch project
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData.project);
        }

        // Fetch chapters
        const chaptersRes = await fetch(`/api/projects/${projectId}/chapters`);
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          setChapters(chaptersData.chapters || []);

          // Select first chapter by default
          if (chaptersData.chapters?.length > 0) {
            setCurrentChapter(chaptersData.chapters[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch project data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      setProjectId(null);
    };
  }, [projectId]);

  // Fetch scenes when chapter changes
  useEffect(() => {
    if (currentChapter) {
      const fetchScenes = async () => {
        try {
          const res = await fetch(`/api/scenes?chapterId=${currentChapter.id}`);
          if (res.ok) {
            const data = await res.json();
            setScenes(data.scenes || []);
          }
        } catch (error) {
          console.error('Failed to fetch scenes:', error);
        }
      };

      fetchScenes();
    }
  }, [currentChapter?.id]);

  // Fetch draft when chapter changes
  useEffect(() => {
    if (currentChapter) {
      const fetchDraft = async () => {
        try {
          const res = await fetch(`/api/chapters/${currentChapter.id}/draft`);
          if (res.ok) {
            const data = await res.json();
            setDraftSegments(data.segments || []);
          }
        } catch (error) {
          console.error('Failed to fetch draft:', error);
        }
      };

      fetchDraft();
    }
  }, [currentChapter?.id]);

  // Listen for chapters refresh event from left sidebar
  useEffect(() => {
    const handleChaptersRefresh = (e: CustomEvent) => {
      setChapters(e.detail || []);
    };
    window.addEventListener('chapters-refresh', handleChaptersRefresh as EventListener);
    return () => {
      window.removeEventListener('chapters-refresh', handleChaptersRefresh as EventListener);
    };
  }, [setChapters]);

  // Listen for draft refresh event from scene panel
  useEffect(() => {
    const handleDraftRefresh = async () => {
      if (currentChapter) {
        try {
          const res = await fetch(`/api/chapters/${currentChapter.id}/draft`);
          if (res.ok) {
            const data = await res.json();
            setDraftSegments(data.segments || []);
          }
        } catch (error) {
          console.error('Failed to fetch draft:', error);
        }
      }
    };
    window.addEventListener('draft-refresh', handleDraftRefresh as EventListener);
    return () => {
      window.removeEventListener('draft-refresh', handleDraftRefresh as EventListener);
    };
  }, [currentChapter?.id, setDraftSegments]);

  // Handle "AI修订本章" button
  const handleReviseChapter = (content: string) => {
    openModal(content, undefined, 'chapter');
  };

  // Chapter content for revision
  const chapterContent = draftSegments.map((s) => s.content).join('\n\n');

  return (
    <div className="h-full flex bg-gray-50">
      {/* Left Sidebar */}
      <LeftSidebar
        projectId={projectId}
        project={project}
        chapters={chapters}
        currentChapter={currentChapter}
        activeTab={leftTab}
        onTabChange={setLeftTab}
        onSelectChapter={setCurrentChapter}
      />

      {/* Scene Panel - hidden in outline view */}
      {leftTab !== 'outline' && (
        <ScenePanel
          projectId={projectId}
          chapterId={currentChapter?.id}
          scenes={scenes}
          segments={draftSegments}
          onScenesChange={setScenes}
          onRefreshChapters={() => {
            // Refresh chapters to update word counts
            fetch(`/api/projects/${projectId}/chapters`)
              .then((res) => res.json())
              .then((data) => setChapters(data.chapters || []));
          }}
        />
      )}

      {/* Main Editor */}
      <main className="flex-1 flex flex-col h-full relative bg-white">
        {leftTab === 'outline' && project ? (
          <OutlineView
            project={project}
            onSelectChapter={setCurrentChapter}
            onRefreshChapters={() => {
              fetch(`/api/projects/${projectId}/chapters`)
                .then((res) => res.json())
                .then((data) => setChapters(data.chapters || []));
            }}
          />
        ) : (
          <>
            <EditorHeader
              project={project}
              chapter={currentChapter}
              wordCount={draftSegments.reduce((sum, seg) => sum + seg.content.length, 0)}
              chapterContent={chapterContent}
              onReviseChapter={handleReviseChapter}
            />

            <RichTextEditor
              chapter={currentChapter}
              segments={draftSegments}
              onSegmentsChange={setDraftSegments}
              onChapterUpdate={(updated) => {
                setChapters(chapters.map(c => c.id === updated.id ? updated : c));
                setCurrentChapter(updated);
              }}
            />
          </>
        )}
      </main>

      {/* Revision Modal */}
      {isModalHydrated && isModalOpen && <RevisionModal />}

      {/* Selection Toolbar */}
      <SelectionToolbar />

      {/* Evaluation Panel */}
      {showEvaluation && currentChapter && (
        <EvaluationPanel
          chapterId={currentChapter.id}
          projectId={projectId}
          isOpen={showEvaluation}
          onClose={() => {
            setShowEvaluation(false);
            setLeftTab('chapters');
          }}
        />
      )}

      {/* Version History Drawer */}
      {showVersionHistory && currentChapter && (
        <VersionHistoryDrawer
          chapterId={currentChapter.id}
          isOpen={showVersionHistory}
          onClose={() => {
            setShowVersionHistory(false);
            setLeftTab('chapters');
          }}
          onSelectVersion={() => {}}
          onRestoreVersion={() => {
            // Refresh after restore
            fetch(`/api/projects/${projectId}/chapters`)
              .then((res) => res.json())
              .then((data) => setChapters(data.chapters || []));
          }}
        />
      )}
    </div>
  );
}
