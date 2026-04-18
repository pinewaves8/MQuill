import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';

export const metadata: Metadata = {
  title: '墨羽 - 小说创作工作室',
  description: 'MQuill - 通用小说创作引擎',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen min-h-screen bg-white text-gray-800 selection:bg-gray-200 selection:text-gray-900">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
