'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, TargetLength } from '@packages/shared-types';

const BOOK_TYPES = [
  { value: 'novel', label: '长篇小说' },
  { value: 'short', label: '短篇小说' },
  { value: 'series', label: '系列作品' },
  { value: 'other', label: '其他' },
];

const LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'ja', label: '日文' },
  { value: 'ko', label: '韩文' },
];

const MODES = [
  { value: 'auto', label: '自动模式' },
  { value: 'co_create', label: '协作模式' },
  { value: 'author_driven', label: '作者驱动模式' },
];

const COVER_TONES = [
  { value: 'amber', label: '琥珀' },
  { value: 'emerald', label: '翡翠' },
  { value: 'blue', label: '天青' },
  { value: 'purple', label: '紫罗兰' },
  { value: 'slate', label: '石墨' },
  { value: 'rose', label: '玫瑰' },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookType, setBookType] = useState<Project['bookType']>('novel');
  const [targetLength, setTargetLength] = useState<Project['targetLength']>('long');
  const [language, setLanguage] = useState<Project['language']>('zh');
  const [mode, setMode] = useState<Project['mode']>('auto');
  const [coverTone, setCoverTone] = useState<Project['coverTone']>('amber');
  const [viewpoint, setViewpoint] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [styleKeywords, setStyleKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Progress tracking
  const [progressData, setProgressData] = useState<{
    targetWordCount: number;
    currentWordCount: number;
    progress: number;
    dailyProgress: Array<{ date: string; wordsWritten: number; totalWords: number }>;
    stats: {
      totalDaysWriting: number;
      totalWordsWritten: number;
      averageWordsPerDay: number;
      currentStreak: number;
      longestStreak: number;
    };
  } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.project as Project;
          setProject(p);
          setTitle(p.title || '');
          setDescription(p.description || '');
          setBookType(p.bookType || 'novel');
          setTargetLength(p.targetLength || 100000);
          setLanguage(p.language || 'zh');
          setMode(p.mode || 'auto');
          setCoverTone(p.coverTone || 'amber');
          setViewpoint(p.viewpoint || '');
          setTargetAudience(p.targetAudience || '');
          setStyleKeywords(p.styleKeywords || []);
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();

    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/progress`);
        if (res.ok) {
          const data = await res.json();
          setProgressData(data);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    };

    fetchProgress();
  }, [projectId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          bookType,
          targetLength,
          language,
          mode,
          coverTone,
          viewpoint,
          targetAudience,
          styleKeywords,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setSaveMessage('保存成功');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage('保存失败');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      setSaveMessage('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !styleKeywords.includes(newKeyword.trim())) {
      setStyleKeywords([...styleKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setStyleKeywords(styleKeywords.filter((k) => k !== keyword));
  };

  const handleExport = async (format: 'markdown' | 'pdf' | 'epub') => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/export/${projectId}?format=${format}`);
      if (res.ok) {
        const mimeType = format === 'pdf' ? 'application/pdf' : format === 'epub' ? 'application/epub+zip' : 'text/markdown;charset=utf-8';
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'project'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`导出失败: ${errorData.error || res.statusText}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}/editor`)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回编辑器
            </button>
            <h1 className="text-xl font-bold text-gray-900">项目设置</h1>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={`text-sm ${saveMessage === '保存成功' ? 'text-emerald-600' : 'text-red-600'}`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>

      {/* Form - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本信息</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="输入项目名称..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="描述你的作品..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作品类型</label>
              <select
                value={bookType}
                onChange={(e) => setBookType(e.target.value as Project['bookType'])}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BOOK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标字数</label>
              <select
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value as Project['targetLength'])}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="short">短篇 (&lt;3万字)</option>
                <option value="mid">中篇 (3-10万字)</option>
                <option value="long">长篇 (&gt;10万字)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Writing Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">写作设置</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Project['language'])}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创作模式</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Project['mode'])}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">叙事视角</label>
            <input
              type="text"
              value={viewpoint}
              onChange={(e) => setViewpoint(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="如：第一人称、第三人称全知..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标读者</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="如：16-25岁年轻女性"
            />
          </div>
        </div>

        {/* Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">风格设定</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">封面色调</label>
            <div className="flex gap-3">
              {COVER_TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setCoverTone(tone.value as Project['coverTone'])}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    coverTone === tone.value
                      ? 'ring-2 ring-offset-2 ring-purple-500'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: {
                      amber: '#fef3c7',
                      emerald: '#d1fae5',
                      blue: '#dbeafe',
                      purple: '#ede9fe',
                      slate: '#e2e8f0',
                      rose: '#fce7f3',
                    }[tone.value],
                  }}
                  title={tone.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">风格关键词</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {styleKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入风格关键词..."
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* Writing Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">写作进度</h2>
          {progressData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{progressData.currentWordCount.toLocaleString()} 字</span>
                  <span className="text-gray-600">目标 {progressData.targetWordCount.toLocaleString()} 字</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progressData.progress, 100)}%` }}
                  />
                </div>
                <div className="text-right text-sm text-gray-500">{progressData.progress}% 完成</div>
              </div>
              <div className="grid grid-cols-4 gap-4 pt-2">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{progressData.stats.currentStreak}</div>
                  <div className="text-xs text-gray-500">当前连续天数</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{progressData.stats.longestStreak}</div>
                  <div className="text-xs text-gray-500">最长连续天数</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{progressData.stats.averageWordsPerDay}</div>
                  <div className="text-xs text-gray-500">日均字数</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{progressData.stats.totalDaysWriting}</div>
                  <div className="text-xs text-gray-500">总写作天数</div>
                </div>
              </div>
              {progressData.dailyProgress.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">最近写作</h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {progressData.dailyProgress.map((day) => (
                      <div key={day.date} className="flex justify-between text-sm py-1 px-2 hover:bg-gray-50 rounded">
                        <span className="text-gray-600">{day.date}</span>
                        <span className="text-gray-900 font-medium">+{day.wordsWritten.toLocaleString()} 字</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 py-4 text-center">加载进度数据...</div>
          )}
        </div>

        {/* Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">导出作品</h2>
          <p className="text-sm text-gray-500">将你的作品导出为不同格式</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('markdown')}
              disabled={isExporting}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Markdown
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => handleExport('epub')}
              disabled={isExporting}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              EPUB
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
