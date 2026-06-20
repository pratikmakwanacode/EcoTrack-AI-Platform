import fs from 'fs';
import path from 'path';

export interface UserProfile {
  hasCalculated: boolean;
  electricity: number;
  gas: number;
  carKm: number;
  flights: number;
  diet: 'Vegan' | 'Vegetarian' | 'Non-Vegetarian';
  carbonScore: number;
  originalScore: number;
  points: number;
  completedChallenges: string[];
}

export interface LeaderboardUser {
  name: string;
  userId?: string;
  points: number;
  carbonScore: number;
  rank: number;
  isCurrentUser: boolean;
  badge: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  carbonReduction: number;
  category: 'Housing' | 'Travel' | 'Lifestyle';
}

export interface DatabaseSchema {
  userProfile: UserProfile;
  leaderboard: LeaderboardUser[];
  challenges: Challenge[];
}

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');

// Helper to read database
export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create empty db from default schema if missing
      const defaultDb: DatabaseSchema = {
        userProfile: {
          hasCalculated: false,
          electricity: 0,
          gas: 0,
          carKm: 0,
          flights: 0,
          diet: 'Non-Vegetarian',
          carbonScore: 0,
          originalScore: 0,
          points: 0,
          completedChallenges: []
        },
        leaderboard: [
          { name: "Elena Rostova", points: 450, carbonScore: 2100, rank: 1, isCurrentUser: false, badge: "Eco Champion" },
          { name: "Marcus Vance", points: 380, carbonScore: 3200, rank: 2, isCurrentUser: false, badge: "Green Advocate" },
          { name: "Sarah Chen", points: 320, carbonScore: 1800, rank: 3, isCurrentUser: false, badge: "Carbon Cutter" },
          { name: "You (Eco Warrior)", points: 0, carbonScore: 0, rank: 7, isCurrentUser: true, badge: "Beginner" },
          { name: "David Kim", points: 240, carbonScore: 4100, rank: 4, isCurrentUser: false, badge: "Waste Reducer" },
          { name: "Amina Diop", points: 190, carbonScore: 2800, rank: 5, isCurrentUser: false, badge: "Conscious Citizen" },
          { name: "Liam O'Connor", points: 150, carbonScore: 3500, rank: 6, isCurrentUser: false, badge: "Starter" }
        ],
        challenges: [
          {
            id: "unplug-vampire",
            title: "Unplug Vampire Electronics",
            description: "Unplug appliances and chargers when not in use to eliminate phantom power draw.",
            points: 50,
            carbonReduction: 120,
            category: "Housing"
          },
          {
            id: "public-transit",
            title: "Switch Commutes to Transit",
            description: "Replace at least two weekly car trips with public transit, walking, or biking.",
            points: 80,
            carbonReduction: 240,
            category: "Travel"
          },
          {
            id: "meatless-monday",
            title: "Adopt Meatless Days",
            description: "Go vegetarian or vegan for at least two days a week to lower food emissions.",
            points: 60,
            carbonReduction: 180,
            category: "Lifestyle"
          },
          {
            id: "lower-thermostat",
            title: "Optimize Home Temperature",
            description: "Lower thermostat by 1-2°C in winter or raise it in summer.",
            points: 40,
            carbonReduction: 90,
            category: "Housing"
          },
          {
            id: "bike-commute",
            title: "Pedal Power",
            description: "Use a bicycle or walk for all short trips under 5 kilometers.",
            points: 70,
            carbonReduction: 150,
            category: "Travel"
          },
          {
            id: "led-bulbs",
            title: "Switch to LED Bulbs",
            description: "Replace your home's 5 most used incandescent bulbs with energy-efficient LEDs.",
            points: 50,
            carbonReduction: 110,
            category: "Housing"
          }
        ]
      };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading database:", error);
    // Return empty schema in case of error
    return {
      userProfile: { hasCalculated: false, electricity: 0, gas: 0, carKm: 0, flights: 0, diet: 'Non-Vegetarian', carbonScore: 0, originalScore: 0, points: 0, completedChallenges: [] },
      leaderboard: [],
      challenges: []
    };
  }
}

// Helper to write database
export function saveDb(data: DatabaseSchema): boolean {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}
