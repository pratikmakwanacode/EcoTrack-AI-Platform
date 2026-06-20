import crypto from 'crypto';
import { getSqlDb } from './sqlite';

const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-ai-super-secret-key-2026';

export interface TokenPayload {
  userId: string;
  username: string;
}

export function signJwt(payload: TokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');
    
  return `${signatureInput}.${signature}`;
}

export function verifyJwt(token: string): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  const signatureInput = `${header}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');
    
  if (signature !== expectedSignature) {
    return null;
  }
  
  try {
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
}

// Authenticate request and return token payload or null
export function authenticateRequest(request: Request): TokenPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyJwt(token);
}

// Ensure the user exists in the SQL database, creating them if necessary
export async function ensureUserExistsInDb(userId: string, username: string): Promise<void> {
  const db = await getSqlDb();
  
  // Parameterized check
  const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    // Parameterized insert
    await db.run('INSERT INTO users (id, username) VALUES (?, ?)', [userId, username]);
  }
}
