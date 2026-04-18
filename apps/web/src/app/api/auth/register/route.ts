import { NextResponse } from 'next/server';
import { authStore } from '@/lib/db/auth-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const result = await authStore.register(email, password, name);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-login after registration
    const loginResult = await authStore.login(email, password);

    if ('error' in loginResult) {
      return NextResponse.json({ error: 'Registration successful but login failed' }, { status: 500 });
    }

    const response = NextResponse.json({
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
    });

    response.cookies.set('session', loginResult.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}