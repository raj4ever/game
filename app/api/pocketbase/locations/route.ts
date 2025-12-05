// PocketBase locations API route
import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get active location
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const active = url.searchParams.get('active');
    
    let filter = '';
    if (active === 'true') {
      filter = '?filter=active%20%3D%20true&sort=-created&perPage=1';
    }
    
    const response = await fetch(`${POCKETBASE_URL}/api/collections/locations/records${filter}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST - Create location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const cookieToken = request.cookies.get('pb_auth_token')?.value;
    
    // Use Authorization header or cookie token
    const token = authHeader || cookieToken;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : token;
    }
    
    const response = await fetch(`${POCKETBASE_URL}/api/collections/locations/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}

