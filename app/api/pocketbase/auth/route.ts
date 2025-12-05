// PocketBase admin authentication API route
import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // PocketBase admin auth returns: { token, admin: {...} }
      // Also set cookie for session management
      const responseObj = NextResponse.json(data, { status: 200 });
      if (data.token) {
        responseObj.cookies.set('pb_auth_token', data.token, {
          httpOnly: false, // Allow client-side access
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }
      return responseObj;
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

