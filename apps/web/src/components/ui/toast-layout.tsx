'use client';

import { ToastProvider } from './toast-provider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
