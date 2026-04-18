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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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

      {/* Form */}
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
      </div>
    </div>
  );
}
