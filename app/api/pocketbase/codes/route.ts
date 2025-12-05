// PocketBase codes API route
import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get codes with filter
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const locationId = url.searchParams.get('location_id');
    const used = url.searchParams.get('used');
    
    let filter = '';
    const filters: string[] = [];
    if (code) filters.push(`code = "${code}"`);
    if (locationId) filters.push(`location_id = "${locationId}"`);
    if (used !== null) filters.push(`used = ${used}`);
    
    if (filters.length > 0) {
      filter = `?filter=${encodeURIComponent(filters.join(' && '))}`;
    }
    
    const response = await fetch(`${POCKETBASE_URL}/api/collections/codes/records${filter}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get codes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch codes' },
      { status: 500 }
    );
  }
}

// POST - Create code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const cookieToken = request.cookies.get('pb_auth_token')?.value;
    
    const token = authHeader || cookieToken;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : token;
    }
    
    const response = await fetch(`${POCKETBASE_URL}/api/collections/codes/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Create code error:', error);
    return NextResponse.json(
      { error: 'Failed to create code' },
      { status: 500 }
    );
  }
}

