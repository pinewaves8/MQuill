import { NextResponse } from 'next/server';
import { authStore } from '@/lib/db/auth-store';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const session = await authStore.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await authStore.getUserById(session.userId);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}