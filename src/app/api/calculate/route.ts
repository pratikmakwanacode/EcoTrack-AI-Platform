import { NextResponse } from 'next/server';
import { getDb, saveDb, UserProfile } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.userProfile);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electricity, gas, carKm, flights, diet } = body;

    // Validate inputs
    const elecVal = parseFloat(electricity) || 0;
    const gasVal = parseFloat(gas) || 0;
    const carKmVal = parseFloat(carKm) || 0;
    const flightsVal = parseFloat(flights) || 0;
    const dietVal = diet || 'Non-Vegetarian';

    // Calculate Diet Score
    let dietScore = 250; // Non-Vegetarian
    if (dietVal === 'Vegan') dietScore = 100;
    else if (dietVal === 'Vegetarian') dietScore = 150;

    // Standard formula (calculated monthly)
    // Monthly CO2 = (Electricity * 0.85) + (Fuel/Gas * 2.3) + (Travel KM * 0.2) + Diet
    // Plus Flights scaled to monthly: (Flights * 400) / 12
    const monthlyFlightEmissions = (flightsVal * 400) / 12;
    const monthlyElectricityEmissions = elecVal * 0.85;
    const monthlyGasEmissions = gasVal * 2.3;
    const monthlyCarEmissions = carKmVal * 0.2;

    const totalMonthlyCO2 = 
      monthlyElectricityEmissions + 
      monthlyGasEmissions + 
      monthlyCarEmissions + 
      dietScore + 
      monthlyFlightEmissions;

    // We store the annual equivalent as the baseline (kg CO2 / year)
    const annualScore = Math.round(totalMonthlyCO2 * 12);

    const db = getDb();
    
    // Update user profile
    const currentCompleted = db.userProfile.completedChallenges || [];
    let activeReduction = 0;
    let earnedPoints = 0;

    // Calculate reductions from already completed challenges
    currentCompleted.forEach(id => {
      const chal = db.challenges.find(c => c.id === id);
      if (chal) {
        activeReduction += chal.carbonReduction;
        earnedPoints += chal.points;
      }
    });

    const updatedProfile: UserProfile = {
      hasCalculated: true,
      electricity: elecVal,
      gas: gasVal,
      carKm: carKmVal,
      flights: flightsVal,
      diet: dietVal,
      originalScore: annualScore,
      carbonScore: Math.max(0, annualScore - activeReduction), // Real-time score reduces
      points: earnedPoints,
      completedChallenges: currentCompleted
    };

    db.userProfile = updatedProfile;

    // Update the current user standings in the leaderboard
    const currentUserIdx = db.leaderboard.findIndex(u => u.isCurrentUser);
    if (currentUserIdx !== -1) {
      db.leaderboard[currentUserIdx].points = earnedPoints;
      db.leaderboard[currentUserIdx].carbonScore = updatedProfile.carbonScore;
      
      // Determine badge based on points
      if (earnedPoints >= 300) db.leaderboard[currentUserIdx].badge = "Eco Champion";
      else if (earnedPoints >= 200) db.leaderboard[currentUserIdx].badge = "Green Advocate";
      else if (earnedPoints >= 100) db.leaderboard[currentUserIdx].badge = "Carbon Cutter";
      else db.leaderboard[currentUserIdx].badge = "Beginner";
    }

    // Sort leaderboard by points (descending) and assign new ranks
    db.leaderboard.sort((a, b) => b.points - a.points);
    db.leaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    saveDb(db);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      leaderboard: db.leaderboard,
      breakdown: {
        housing: Math.round((monthlyElectricityEmissions + monthlyGasEmissions) * 12),
        travel: Math.round((monthlyCarEmissions + monthlyFlightEmissions) * 12),
        lifestyle: Math.round(dietScore * 12),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
