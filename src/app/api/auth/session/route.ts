import { NextResponse } from 'next/server';
import { signJwt, verifyJwt, ensureUserExistsInDb } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    let authHeader = request.headers.get('Authorization');
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // 1. Try to restore session from existing token
    if (token) {
      const decoded = verifyJwt(token);
      if (decoded) {
        // Double-check the user is registered in the DB
        await ensureUserExistsInDb(decoded.userId, decoded.username);
        return NextResponse.json({
          success: true,
          user: decoded,
          token
        });
      }
    }
    
    // 2. Otherwise, check if user is logging in with a username
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body may be empty, that's fine
    }
    
    let userId = '';
    let username = '';
    
    if (body.username && typeof body.username === 'string' && body.username.trim()) {
      username = body.username.trim();
      // Deterministic but safe userId hash from username
      userId = 'usr_' + Buffer.from(username.toLowerCase()).toString('hex').substring(0, 16);
    } else {
      // No username supplied — reject the request rather than creating a guest identity
      return NextResponse.json(
        { success: false, error: 'Username (email) is required to create a session.' },
        { status: 400 }
      );
    }
    
    // Register the user in the relational database
    await ensureUserExistsInDb(userId, username);
    
    // Sign a fresh secure JWT token
    const newToken = signJwt({ userId, username });
    
    return NextResponse.json({
      success: true,
      user: { userId, username },
      token: newToken
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Auth API error:", error);
    return NextResponse.json({ success: false, error: 'Authentication Failure' }, { status: 500 });
  }
}
