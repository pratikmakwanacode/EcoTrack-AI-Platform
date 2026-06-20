import { NextResponse } from 'next/server';
import { getSqlDb } from '@/lib/sqlite';
import { LeaderboardUser } from '@/lib/db';

const MOCK_NAMES: { [key: string]: string } = {
  'user_elena': 'Elena Rostova',
  'user_marcus': 'Marcus Vance',
  'user_sarah': 'Sarah Chen',
  'user_david': 'David Kim',
  'user_amina': 'Amina Diop',
  'user_liam': 'Liam O\'Connor'
};

const MOCK_BADGES = (points: number) => {
  if (points >= 300) return 'Eco Champion';
  if (points >= 200) return 'Green Advocate';
  if (points >= 100) return 'Carbon Cutter';
  return 'Beginner';
};

export async function GET() {
  try {
    const db = await getSqlDb();

    // Aggregate SQL query to calculate sum of all scores per user_id, ordered by footprint ascending (lower is better)
    const dbUsers = await db.all(`
      SELECT 
        user_id, 
        SUM(total_co2_score) as total_co2,
        COUNT(*) as log_count
      FROM carbon_footprint_logs 
      GROUP BY user_id 
      ORDER BY total_co2 ASC 
      LIMIT 10
    `);

    // Let's seed initial mock data if database logs count is zero, so that the leaderboard is never blank
    if (dbUsers.length === 0) {
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_elena', 120, 300, 'Vegan', 2100)");
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_marcus', 180, 500, 'Vegetarian', 3200)");
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_sarah', 100, 200, 'Vegan', 1800)");
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_david', 250, 600, 'Non-Vegetarian', 4100)");
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_amina', 150, 400, 'Vegetarian', 2800)");
      await db.run("INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score) VALUES ('user_liam', 200, 500, 'Non-Vegetarian', 3500)");

      // Re-query
      const reQuery = await db.all(`
        SELECT user_id, SUM(total_co2_score) as total_co2, COUNT(*) as log_count
        FROM carbon_footprint_logs 
        GROUP BY user_id 
        ORDER BY total_co2 ASC 
        LIMIT 10
      `);
      dbUsers.push(...reQuery);
    }

    const leaderboard: LeaderboardUser[] = dbUsers.map((u, index) => {
      const name = MOCK_NAMES[u.user_id] || (u.user_id === 'current_user' ? 'You (Eco Warrior)' : `User #${u.user_id.slice(-4)}`);
      const isCurrentUser = u.user_id === 'current_user';
      // Mock points based on logs count and ranking status
      const mockPoints = u.log_count * 50 + (index < 3 ? (3 - index) * 50 : 0);

      return {
        name,
        points: mockPoints,
        carbonScore: Math.round(u.total_co2),
        rank: index + 1,
        isCurrentUser,
        badge: MOCK_BADGES(mockPoints)
      };
    });

    // Make sure 'current_user' is present in the leaderboard, if not, add it at the bottom to represent rank
    const hasCurrentUser = leaderboard.some(u => u.isCurrentUser);
    if (!hasCurrentUser) {
      leaderboard.push({
        name: 'You (Eco Warrior)',
        points: 0,
        carbonScore: 0,
        rank: leaderboard.length + 1,
        isCurrentUser: true,
        badge: 'Beginner'
      });
    }

    // Sort leaderboard in order of points descending for gamification ranking, or score ascending depending on preferences
    // Sorting by points descending is standard for scoreboards, which fits points completed
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((user, idx) => {
      user.rank = idx + 1;
    });

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error("SQL Leaderboard error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
