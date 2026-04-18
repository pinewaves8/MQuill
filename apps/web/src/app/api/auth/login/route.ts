import { NextResponse } from 'next/server';
import { authStore } from '@/lib/db/auth-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const result = await authStore.login(email, password);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Set session cookie
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });

    response.cookies.set('session', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}