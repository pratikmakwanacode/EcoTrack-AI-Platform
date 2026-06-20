import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '@/lib/auth';

// POST /api/ai-insights
export async function POST(request: Request) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { electricity, travel, diet, score } = body;

    const elecVal = parseFloat(electricity) || 0;
    const travelVal = parseFloat(travel) || 0;
    const dietVal = diet || 'Non-Vegetarian';
    const scoreVal = parseFloat(score) || 0;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
          You are an expert sustainability consultant and AI advisor for "EcoTrack AI".
          Analyze the following annual carbon footprint data:
          - Electricity: ${elecVal} kWh/month
          - Travel: ${travelVal} KM/month
          - Diet Type: ${dietVal}
          - Total Carbon Score: ${scoreVal} kg CO₂/year

          Please output a JSON object with this exact structure:
          {
            "breakdownAnalysis": "A detailed 1-2 sentence analysis highlighting the highest emissions driver and the impact relative to average guidelines.",
            "challenges": [
              {
                "id": "ai-challenge-1",
                "title": "A short actionable title (e.g., Switch to LED bulbs)",
                "description": "A specific description of what the user should do this week.",
                "points": 50,
                "carbonReduction": 120,
                "category": "Housing"
              },
              {
                "id": "ai-challenge-2",
                "title": "A short actionable title",
                "description": "A specific description of what the user should do this week.",
                "points": 80,
                "carbonReduction": 200,
                "category": "Travel"
              },
              {
                "id": "ai-challenge-3",
                "title": "A short actionable title",
                "description": "A specific description of what the user should do this week.",
                "points": 60,
                "carbonReduction": 150,
                "category": "Lifestyle"
              }
            ]
          }
          Return ONLY valid JSON. Do not write any markdown code fences, backticks, or formatting text. Just the JSON object.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        
        // Clean text if markdown formatting slipped through
        const cleanJsonStr = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        return NextResponse.json({ success: true, source: 'Gemini API', ...parsed });
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to heuristics:", geminiError);
      }
    }

    // Heuristics Fallback Engine (Zero API Keys required, 100% stable)
    let highestSource = 'Housing';
    let analysis = '';
    const challengesList = [];

    const housingAnn = elecVal * 0.85 * 12;
    const travelAnn = travelVal * 0.2 * 12;
    let dietScore = 250;
    if (dietVal === 'Vegan') dietScore = 100;
    else if (dietVal === 'Vegetarian') dietScore = 150;
    const lifestyleAnn = dietScore * 12;

    if (travelAnn > housingAnn && travelAnn > lifestyleAnn) highestSource = 'Travel';
    else if (lifestyleAnn > housingAnn && lifestyleAnn > travelAnn) highestSource = 'Lifestyle';

    if (highestSource === 'Housing') {
      analysis = `Your electricity consumption accounts for the highest emissions at ${Math.round(housingAnn)} kg CO₂/yr. Swapping utility plans or switching off vampire loads will decrease this.`;
      challengesList.push(
        {
          id: "ai-housing-1",
          title: "Vampire Power Cut",
          description: "Unplug 5 inactive chargers and stand-by electronics overnight to eliminate vampire draw.",
          points: 50,
          carbonReduction: 110,
          category: "Housing"
        },
        {
          id: "ai-housing-2",
          title: "Optimize Fridge Temp",
          description: "Set your refrigerator to 3°C and freezer to -18°C for optimal efficiency.",
          points: 40,
          carbonReduction: 90,
          category: "Housing"
        },
        {
          id: "ai-lifestyle-1",
          title: "Local Produce Only",
          description: "Source 80% of your grocery shopping from local regional markets to reduce food transit emissions.",
          points: 60,
          carbonReduction: 130,
          category: "Lifestyle"
        }
      );
    } else if (highestSource === 'Travel') {
      analysis = `Your vehicle distance driven accounts for the highest emissions at ${Math.round(travelAnn)} kg CO₂/yr. Active commutes can make a major dent.`;
      challengesList.push(
        {
          id: "ai-travel-1",
          title: "Transit Commute Challenge",
          description: "Swap 3 single-driver car trips this week with public train or bus transit.",
          points: 80,
          carbonReduction: 210,
          category: "Travel"
        },
        {
          id: "ai-travel-2",
          title: "Under-5km Pedaling",
          description: "Commit to walking or cycling for all grocery or gym errands under 5km.",
          points: 70,
          carbonReduction: 160,
          category: "Travel"
        },
        {
          id: "ai-housing-3",
          title: "Dim the Lights",
          description: "Turn off lights in unoccupied rooms immediately to save home utility loads.",
          points: 30,
          carbonReduction: 60,
          category: "Housing"
        }
      );
    } else {
      analysis = `Your diet selection constitutes the highest portion of your footprint at ${Math.round(lifestyleAnn)} kg CO₂/yr. Choosing low-impact proteins makes a huge impact.`;
      challengesList.push(
        {
          id: "ai-lifestyle-2",
          title: "Double Vegan Days",
          description: "Eat a 100% plant-based diet for at least two days this week.",
          points: 60,
          carbonReduction: 140,
          category: "Lifestyle"
        },
        {
          id: "ai-lifestyle-3",
          title: "Zero Food Waste",
          description: "Meal plan rigorously to reduce household organic waste to absolute zero.",
          points: 50,
          carbonReduction: 100,
          category: "Lifestyle"
        },
        {
          id: "ai-travel-3",
          title: "Tire Pressure Optimization",
          description: "Inflate your vehicle tires to their recommended PSI to maximize fuel economy.",
          points: 40,
          carbonReduction: 80,
          category: "Travel"
        }
      );
    }

    return NextResponse.json({
      success: true,
      source: 'Local Heuristics',
      breakdownAnalysis: analysis,
      challenges: challengesList
    });

  } catch (error: any) {
    console.error("AI Insights error:", error);
    return NextResponse.json({ success: false, error: 'AI Computation Failure' }, { status: 500 });
  }
}
