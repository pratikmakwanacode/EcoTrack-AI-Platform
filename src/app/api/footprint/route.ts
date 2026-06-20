import { NextResponse } from 'next/server';
import { getSqlDb } from '@/lib/sqlite';
import { authenticateRequest } from '@/lib/auth';

// GET /api/footprint
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing or invalid' }, { status: 401 });
    }

    const db = await getSqlDb();
    
    // Secure parameterized SELECT query bound explicitly to the authenticated user's ID
    const logs = await db.all(
      'SELECT id, user_id, electricity_kwh, travel_km, diet_type, total_co2_score, recorded_at FROM carbon_footprint_logs WHERE user_id = ? ORDER BY recorded_at DESC',
      [user.userId]
    );

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        electricity: log.electricity_kwh,
        travel: log.travel_km,
        diet: log.diet_type,
        calculatedScore: log.total_co2_score,
        date: new Date(log.recorded_at).toLocaleDateString('en-GB').replace(/\//g, '-') // format to DD-MM-YYYY
      }))
    });

  } catch (error: any) {
    console.error("SQL SELECT error:", error);
    return NextResponse.json({ success: false, error: 'Database Retrieval Failure' }, { status: 500 });
  }
}

// POST /api/footprint
export async function POST(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing or invalid' }, { status: 401 });
    }

    const body = await request.json();
    const { electricity_kwh, travel_km, diet_type } = body;

    const elecVal = parseFloat(electricity_kwh);
    const travelVal = parseFloat(travel_km);

    if (isNaN(elecVal) || elecVal < 0 || isNaN(travelVal) || travelVal < 0) {
      return NextResponse.json({ success: false, error: 'Electricity and Travel values must be positive numbers.' }, { status: 400 });
    }

    if (!diet_type || !['Vegan', 'Vegetarian', 'Non-Vegetarian'].includes(diet_type)) {
      return NextResponse.json({ success: false, error: 'Invalid Diet Type supplied.' }, { status: 400 });
    }

    // Server-side calculation to prevent tampering
    let dietScore = 250;
    if (diet_type === 'Vegan') dietScore = 100;
    else if (diet_type === 'Vegetarian') dietScore = 150;

    const monthlyCO2 = (elecVal * 0.85) + (travelVal * 0.2) + dietScore;
    const annualCO2 = Math.round(monthlyCO2 * 12);

    const db = await getSqlDb();

    // Secure parameterized INSERT query (Prepared Statement style) bound to the authenticated user's ID
    const result = await db.run(
      `INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score)
       VALUES (?, ?, ?, ?, ?)`,
      [user.userId, elecVal, travelVal, diet_type, annualCO2]
    );

    // Fetch the newly inserted record to return to frontend
    const newLog = await db.get(
      'SELECT id, user_id, electricity_kwh, travel_km, diet_type, total_co2_score, recorded_at FROM carbon_footprint_logs WHERE id = ?',
      [result.lastID]
    );

    return NextResponse.json({
      success: true,
      log: {
        id: newLog.id,
        userId: newLog.user_id,
        electricity: newLog.electricity_kwh,
        travel: newLog.travel_km,
        diet: newLog.diet_type,
        calculatedScore: newLog.total_co2_score,
        date: new Date(newLog.recorded_at).toLocaleDateString('en-GB').replace(/\//g, '-')
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("SQL INSERT error:", error);
    return NextResponse.json({ success: false, error: 'Database Write Failure' }, { status: 500 });
  }
}

// DELETE /api/footprint
export async function DELETE(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing or invalid' }, { status: 401 });
    }

    const body = await request.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Log ID is required.' }, { status: 400 });
    }

    const db = await getSqlDb();

    // Secure parameterized DELETE query explicitly checking that the log belongs to this authenticated user
    const result = await db.run(
      'DELETE FROM carbon_footprint_logs WHERE id = ? AND user_id = ?',
      [logId, user.userId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'Log entry not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Log deleted successfully.' });

  } catch (error: any) {
    console.error("SQL DELETE error:", error);
    return NextResponse.json({ success: false, error: 'Database Delete Failure' }, { status: 500 });
  }
}
