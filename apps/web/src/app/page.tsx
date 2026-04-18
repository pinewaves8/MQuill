'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@packages/shared-types';
import { ProjectCard } from '@/components/project/project-card';
import { CreateProjectModal } from '@/components/project/create-project-modal';
import { toast } from '@/components/ui/toast';
import { AuthModal } from '@/components/auth/auth-modal';

const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'bootstrapping', label: '引导中' },
  { value: 'active', label: '连载中' },
  { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完结' },
  { value: 'archived', label: '已归档' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchCurrentUser();
  }, []);

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
    setIsModalOpen(false);

    // If auto mode, call bootstrap API to generate charter
    if (project.mode === 'auto') {
      fetch(`/api/agents/bootstrap/${project.id}`, { method: 'POST' })
        .then((res) => {
          if (!res.ok) {
            console.error('Failed to bootstrap project');
          }
        })
        .finally(() => {
          router.push(`/projects/${project.id}/editor?tab=outline`);
        });
    } else {
      router.push(`/projects/${project.id}/editor?tab=outline`);
    }
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    toast.success('项目已删除');
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    bootstrapping: '引导中',
    active: '连载中',
    paused: '已暂停',
    completed: '已完结',
    archived: '已归档',
  };

  return (
    <div className="h-full flex flex-col fade-in">
      {/* Header */}
      <header className="glass-effect border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-serif text-xl shadow-lg">
            羽
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">墨羽</h1>
            <p className="text-xs text-gray-500">小说创作工作室</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1 bg-gray-100/50 rounded-full p-1">
            <button className="px-4 py-2 rounded-full text-sm font-medium text-gray-900 bg-white shadow-sm transition-all">
              我的作品
            </button>
            <button className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-all">
              灵感库
            </button>
            <button className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-all">
              社区
            </button>
          </nav>

          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-full pr-2 transition-colors"
            >
              {currentUser ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium border-2 border-white shadow-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 pr-2">{currentUser.name}</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-white shadow-sm">
                    ?
                  </div>
                  <span className="text-sm font-medium text-gray-500 pr-2">登录</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {currentUser ? `欢迎回来，${currentUser.name}` : '欢迎来到墨羽'}
          </h2>
          <p className="text-gray-600">
            今天是个创作的好日子。你目前有{' '}
            <span className="font-semibold text-gray-900">{filteredProjects.length}</span>
            {searchQuery || statusFilter !== 'all' ? `/${projects.length}` : ''}{' '}
            本进行中的作品。
          </p>
        </div>

        {/* Create New Book */}
        <div className="mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="group w-full max-w-sm bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-left hover:shadow-2xl transition-all duration-300 border border-gray-700 hover:border-gray-600"
          >
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">创建新书</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              开始一个全新的创作旅程，定义你的世界和角色。
            </p>
            <div className="mt-4 flex items-center gap-2 text-white/80 text-sm font-medium group-hover:translate-x-1 transition-transform">
              立即开始
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">我的作品</h3>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索作品..."
                  className="pl-9 pr-4 py-2 w-48 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="h-40 bg-gray-100 animate-pulse" />
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">还没有作品，点击上方按钮开始创作</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  statusLabel={statusLabels[project.status] || project.status}
                  onDelete={handleProjectDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProjectCreated}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user.id ? user : null);
        }}
      />
    </div>
  );
}
