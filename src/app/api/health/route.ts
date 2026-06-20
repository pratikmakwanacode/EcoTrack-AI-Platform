import { NextResponse } from 'next/server';
import { getSqlDb } from '@/lib/sqlite';

export async function GET() {
  const status = {
    database: 'offline',
    geminiApi: 'offline',
    healthy: false
  };

  // 1. Probe SQL Database connection
  try {
    const db = await getSqlDb();
    await db.get('SELECT 1');
    status.database = 'online';
  } catch (err) {
    console.error("Health check Database connection failed:", err);
    status.database = 'offline';
  }

  // 2. Probe Gemini API host connectivity (HEAD handshake request)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout limit

    const geminiRes = await fetch('https://generativelanguage.googleapis.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Any status in 2xx, 3xx or 4xx range indicates the host resolved, handshook, and answered
    if (geminiRes.status >= 200 && geminiRes.status < 500) {
      status.geminiApi = 'online';
    } else {
      status.geminiApi = 'offline';
    }
  } catch (err) {
    console.error("Health check Gemini API connection failed:", err);
    status.geminiApi = 'offline';
  }

  status.healthy = status.database === 'online' && status.geminiApi === 'online';

  return NextResponse.json(status, { 
    status: status.healthy ? 200 : 503 
  });
}
