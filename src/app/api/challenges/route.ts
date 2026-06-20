import { NextResponse } from 'next/server';
import { getSqlDb } from '@/lib/sqlite';
import { authenticateRequest } from '@/lib/auth';
import { getDb } from '@/lib/db'; // Read challenges list from db.json

// GET /api/challenges
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getSqlDb();
    const staticDb = getDb(); // Get standard challenges definition

    // Get user's completed challenges list from SQL database
    const completedRows = await db.all(
      'SELECT challenge_id FROM user_challenges WHERE user_id = ?',
      [user.userId]
    );
    const completedChallenges = completedRows.map(row => row.challenge_id);

    return NextResponse.json({
      challenges: staticDb.challenges,
      completed: completedChallenges
    });
  } catch (error: any) {
    console.error("GET challenges error:", error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve challenges' }, { status: 500 });
  }
}

// POST /api/challenges
export async function POST(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { challengeId, completed } = body;

    const staticDb = getDb();
    const challenge = staticDb.challenges.find(c => c.id === challengeId);

    if (!challenge) {
      return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
    }

    const db = await getSqlDb();

    if (completed) {
      // Secure parameterized INSERT OR IGNORE
      await db.run(
        'INSERT OR IGNORE INTO user_challenges (user_id, challenge_id) VALUES (?, ?)',
        [user.userId, challengeId]
      );
    } else {
      // Secure parameterized DELETE
      await db.run(
        'DELETE FROM user_challenges WHERE user_id = ? AND challenge_id = ?',
        [user.userId, challengeId]
      );
    }

    // Get all completed challenges for the user
    const completedRows = await db.all(
      'SELECT challenge_id FROM user_challenges WHERE user_id = ?',
      [user.userId]
    );
    const completedList = completedRows.map(row => row.challenge_id);

    // Recalculate user points and real-time carbon score
    let totalPoints = 0;
    let totalReduction = 0;

    completedList.forEach(id => {
      const chal = staticDb.challenges.find(c => c.id === id);
      if (chal) {
        totalPoints += chal.points;
        totalReduction += chal.carbonReduction;
      }
    });

    // Update user points in users table
    await db.run(
      'UPDATE users SET points = ? WHERE id = ?',
      [totalPoints, user.userId]
    );

    // Fetch user's latest logs to determine carbonScore
    const latestLog = await db.get(
      'SELECT total_co2_score FROM carbon_footprint_logs WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [user.userId]
    );

    const originalScore = latestLog ? latestLog.total_co2_score : 0;
    const carbonScore = Math.max(0, originalScore - totalReduction);

    // Build user profile object
    const userProfile = {
      hasCalculated: !!latestLog,
      points: totalPoints,
      completedChallenges: completedList,
      originalScore,
      carbonScore
    };

    // Return updated leaderboard status by querying live aggregates
    const dbUsers = await db.all(`
      SELECT 
        u.id as user_id, 
        u.username,
        u.points,
        COALESCE(SUM(l.total_co2_score), 0) as total_co2
      FROM users u
      LEFT JOIN carbon_footprint_logs l ON u.id = l.user_id
      GROUP BY u.id
      ORDER BY u.points DESC, total_co2 ASC
      LIMIT 10
    `);

    const leaderboard = dbUsers.map((u, index) => ({
      name: u.username,
      userId: u.user_id,
      points: u.points || 0,
      carbonScore: Math.round(u.total_co2),
      rank: index + 1,
      isCurrentUser: u.user_id === user.userId,
      badge: totalPoints >= 300 ? 'Eco Champion' : totalPoints >= 200 ? 'Green Advocate' : totalPoints >= 100 ? 'Carbon Cutter' : 'Beginner'
    }));

    return NextResponse.json({
      success: true,
      profile: userProfile,
      leaderboard
    });
  } catch (error: any) {
    console.error("POST challenges error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
