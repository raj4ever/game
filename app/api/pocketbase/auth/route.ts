// PocketBase admin authentication API route
import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // PocketBase returns token in data.token
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
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

