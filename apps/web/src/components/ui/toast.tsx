'use client';

import { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastStoreState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Simple global toast state
let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

export const toast = {
  success: (message: string) => {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, type: 'success', message }];
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 3000);
  },
  error: (message: string) => {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, type: 'error', message }];
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
  },
  info: (message: string) => {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, type: 'info', message }];
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 3000);
  },
};

function useToasts(): Toast[] {
  const [state, setState] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setState);
    setState([...toasts]);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return state;
}

export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-slide-in-right ${
            t.type === 'success' ? 'bg-emerald-600' :
            t.type === 'error' ? 'bg-red-600' :
            'bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.type === 'info' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
