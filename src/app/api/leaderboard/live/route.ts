import { NextResponse } from 'next/server';
import { getSqlDb } from '@/lib/sqlite';
import { authenticateRequest } from '@/lib/auth';

interface LeaderboardUser {
  name: string;
  userId: string;
  points: number;
  carbonScore: number;
  rank: number;
  isCurrentUser: boolean;
  badge: string;
}

const MOCK_BADGES = (points: number) => {
  if (points >= 300) return 'Eco Champion';
  if (points >= 200) return 'Green Advocate';
  if (points >= 100) return 'Carbon Cutter';
  return 'Beginner';
};

export async function GET(request: Request) {
  try {
    const db = await getSqlDb();
    
    // Check if current user is authenticated (to highlight them in the list)
    const currentUser = authenticateRequest(request);
    const currentUserId = currentUser ? currentUser.userId : null;

    // Fetch live users and their dynamic aggregated scores
    const dbUsers = await db.all(`
      SELECT 
        u.id as user_id, 
        u.username,
        u.points,
        COALESCE(SUM(l.total_co2_score), 0) as total_co2,
        COUNT(l.id) as log_count
      FROM users u
      LEFT JOIN carbon_footprint_logs l ON u.id = l.user_id
      GROUP BY u.id
      ORDER BY u.points DESC, total_co2 ASC
      LIMIT 10
    `);

    const leaderboard: LeaderboardUser[] = dbUsers.map((u, index) => {
      const name = u.username;
      const isCurrentUser = currentUserId ? u.user_id === currentUserId : false;

      return {
        name,
        userId: u.user_id,
        points: u.points || 0,
        carbonScore: Math.round(u.total_co2),
        rank: index + 1,
        isCurrentUser,
        badge: MOCK_BADGES(u.points || 0)
      };
    });

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error("SQL Live Leaderboard error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
