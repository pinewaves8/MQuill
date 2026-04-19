'use client';

import { useState, useEffect } from 'react';
import { Project } from '@packages/shared-types';

interface AutoGenProgressModalProps {
  isOpen: boolean;
  bookTitle: string;
  onCancel: () => void;
  onSwitchToManual: () => void;
  project: Project | null;
  onComplete: (project: Project) => void;
}

const STEPS = [
  { name: 'outline', label: '大纲设计' },
  { name: 'scenes', label: '章节场景' },
  { name: 'content', label: '正文撰写' },
  { name: 'eval', label: '质量评估' },
];

export function AutoGenProgressModal({
  isOpen,
  bookTitle,
  onCancel,
  onSwitchToManual,
  project,
  onComplete,
}: AutoGenProgressModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({
    outline: 0,
    scenes: 0,
    content: 0,
    eval: 0,
  });
  const [statusMap, setStatusMap] = useState<Record<string, string>>({
    outline: '等待中',
    scenes: '等待中',
    content: '等待中',
    eval: '等待中',
  });

  useEffect(() => {
    if (!isOpen) return;

    let stepIndex = 0;
    const timers: NodeJS.Timeout[] = [];

    const runStep = (index: number) => {
      if (index >= STEPS.length) {
        setTimeout(() => {
          if (project) {
            onComplete(project);
          }
        }, 500);
        return;
      }

      const step = STEPS[index];
      setCurrentStepIndex(index);
      setStatusMap((prev) => ({ ...prev, [step.name]: '进行中' }));

      // Simulate progress
      let progress = 0;
      const duration = step.name === 'content' ? 5000 : step.name === 'scenes' ? 3000 : 2000;
      const interval = duration / 50;

      const progressTimer = setInterval(() => {
        progress += 2;
        setProgressMap((prev) => ({ ...prev, [step.name]: Math.min(progress, 100) }));

        if (progress >= 100) {
          clearInterval(progressTimer);
          setStatusMap((prev) => ({ ...prev, [step.name]: '完成' }));
          runStep(index + 1);
        }
      }, interval);

      timers.push(progressTimer);
    };

    runStep(0);

    return () => {
      timers.forEach(clearInterval);
    };
  }, [isOpen, onComplete, project]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI 正在全自动创作</h3>
          <p className="text-sm text-gray-600">《{bookTitle}》{STEPS[currentStepIndex]?.label}中...</p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isComplete = statusMap[step.name] === '完成';
            const isActive = statusMap[step.name] === '进行中';
            const isWaiting = statusMap[step.name] === '等待中';

            return (
              <div key={step.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className={isComplete ? 'text-gray-900 font-medium' : isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    {step.label}
                  </span>
                  <span className={`font-medium ${isComplete ? 'text-emerald-600' : isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {isComplete ? '完成' : isActive ? `${progressMap[step.name]}%` : statusMap[step.name]}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-gray-900'}`}
                    style={{ width: isComplete ? '100%' : isActive ? `${progressMap[step.name]}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            取消生成
          </button>
          <button
            onClick={onSwitchToManual}
            className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            转为人机协作
          </button>
        </div>
      </div>
    </div>
  );
}
