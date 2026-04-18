import { NextResponse } from 'next/server';
import { authStore } from '@/lib/db/auth-store';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
      await authStore.logout(sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}