import React from 'react';
import { LayoutDashboard, Award, Flame, Calendar, ArrowRight, Zap, Car, Compass, Footprints, Trash2, Activity } from 'lucide-react';
import { UserProfile, LeaderboardUser } from '@/lib/db';
import TiltCard from '@/components/TiltCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import dynamic from 'next/dynamic';
import ViewportSection from '@/components/ViewportSection';
import ErrorBoundary from '@/components/ErrorBoundary';

const DynamicTrendChart = dynamic(() => import('@/components/TrendChart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse bg-slate-900/10 rounded-2xl flex items-center justify-center text-slate-500 text-xs font-semibold">
      Loading Chart Analytics...
    </div>
  )
});

export interface EcoLog {
  id: number;
  date: string;
  electricity: number;
  travel: number;
  diet: string;
  calculatedScore: number;
}

import { Challenge } from '@/lib/db';

interface DashboardTabProps {
  profile: UserProfile;
  leaderboard: LeaderboardUser[];
  onNavigate: (tab: 'dashboard' | 'calculator' | 'insights' | 'leaderboard') => void;
  breakdown: { housing: number; travel: number; lifestyle: number } | null;
  logs: EcoLog[];
  onDeleteLog?: (id: number) => void;
  challenges: Challenge[];
}

export default function DashboardTab({ profile, leaderboard, onNavigate, breakdown, logs, onDeleteLog, challenges }: DashboardTabProps) {
  const hasData = profile.hasCalculated;
  const [isMounted, setIsMounted] = React.useState(false);
  const [drivingReduction, setDrivingReduction] = React.useState(0);
  const [acHours, setAcHours] = React.useState(0);
  const [plantBasedDays, setPlantBasedDays] = React.useState(0);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prepare chart dataset
  const projectedData = [...logs].reverse().map(log => {
    const electricitySavedKwh = Math.min(log.electricity, acHours * 1.5 * 30.5);
    const electricitySavings = electricitySavedKwh * 0.85;

    const travelSavings = (drivingReduction / 100) * log.travel * 0.2;

    let dietSavings = 0;
    if (log.diet === 'Non-Vegetarian') {
      dietSavings = plantBasedDays * ((250 - 100) / 7);
    } else if (log.diet === 'Vegetarian') {
      dietSavings = plantBasedDays * ((150 - 100) / 7);
    }

    const monthlySavings = electricitySavings + travelSavings + dietSavings;
    const annualSavings = Math.round(monthlySavings * 12);
    return Math.max(0, log.calculatedScore - annualSavings);
  });

  const chartData = {
    labels: [...logs].reverse().map(log => log.date),
    datasets: [
      {
        fill: true,
        label: 'Actual Footprint (kg CO₂/yr)',
        data: [...logs].reverse().map(log => log.calculatedScore),
        borderColor: '#10b981', // Mint/Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.3,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        fill: false,
        label: 'Projected Footprint (kg CO₂/yr)',
        data: projectedData,
        borderColor: '#3b82f6', // Blue
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        tension: 0.3,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 11,
            weight: 'bold' as const
          },
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        padding: 10,
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        usePointStyle: true,
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      }
    }
  };

  // Determine user rank
  const userRank = leaderboard.find(u => u.isCurrentUser)?.rank || 7;
  const userBadge = leaderboard.find(u => u.isCurrentUser)?.badge || 'Beginner';

  // Compute calculated values
  const annualScore = profile.carbonScore;
  const originalScore = profile.originalScore;
  const carbonReduced = Math.max(0, originalScore - annualScore);

  // Simulator calculations
  const simulatedElectricitySavedKwh = Math.min(profile.electricity, acHours * 1.5 * 30.5);
  const simulatedElectricitySavings = simulatedElectricitySavedKwh * 0.85;

  const simulatedTravelSavings = (drivingReduction / 100) * profile.carKm * 0.2;

  let simulatedDietSavings = 0;
  if (profile.diet === 'Non-Vegetarian') {
    simulatedDietSavings = plantBasedDays * ((250 - 100) / 7);
  } else if (profile.diet === 'Vegetarian') {
    simulatedDietSavings = plantBasedDays * ((150 - 100) / 7);
  }

  const simulatedMonthlySavings = simulatedElectricitySavings + simulatedTravelSavings + simulatedDietSavings;
  const simulatedAnnualSavings = Math.round(simulatedMonthlySavings * 12);
  const simulatedAnnualScore = Math.max(0, annualScore - simulatedAnnualSavings);

  // Score categories (Low < 4000, Med 4000-8000, High > 8000 kg CO2/year)
  let impactLevel = 'Low';
  let impactColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  let impactBarColor = 'bg-emerald-500';
  let gaugeAngle = -90; // Leftmost

  if (hasData) {
    if (annualScore < 4000) {
      impactLevel = 'Low Impact 🍃';
      impactColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
      impactBarColor = 'bg-emerald-500';
      // Map score 0-4000 to angle -90 to -30 degrees
      gaugeAngle = -90 + (annualScore / 4000) * 60;
    } else if (annualScore <= 8000) {
      impactLevel = 'Medium Impact ⚠️';
      impactColor = 'text-amber-600 bg-amber-50 border-amber-100';
      impactBarColor = 'bg-amber-500';
      // Map score 4000-8000 to angle -30 to 30 degrees
      gaugeAngle = -30 + ((annualScore - 4000) / 4000) * 60;
    } else {
      impactLevel = 'High Impact 🚨';
      impactColor = 'text-rose-600 bg-rose-50 border-rose-100';
      impactBarColor = 'bg-rose-500';
      // Map score 8000-15000+ to angle 30 to 90 degrees
      gaugeAngle = 30 + Math.min(1, (annualScore - 8000) / 10000) * 60;
    }
  }

  // Simulated Score categories (Low < 4000, Med 4000-8000, High > 8000 kg CO2/year)
  let simulatedImpactLevel = 'Low';
  let simulatedImpactColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  let simulatedGaugeAngle = -90; // Leftmost

  if (hasData) {
    if (simulatedAnnualScore < 4000) {
      simulatedImpactLevel = 'Low Impact 🍃';
      simulatedImpactColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
      simulatedGaugeAngle = -90 + (simulatedAnnualScore / 4000) * 60;
    } else if (simulatedAnnualScore <= 8000) {
      simulatedImpactLevel = 'Medium Impact ⚠️';
      simulatedImpactColor = 'text-amber-600 bg-amber-50 border-amber-100';
      simulatedGaugeAngle = -30 + ((simulatedAnnualScore - 4000) / 4000) * 60;
    } else {
      simulatedImpactLevel = 'High Impact 🚨';
      simulatedImpactColor = 'text-rose-600 bg-rose-50 border-rose-100';
      simulatedGaugeAngle = 30 + Math.min(1, (simulatedAnnualScore - 8000) / 10000) * 60;
    }
  }

  // Calculate percentages for source breakdown if data exists
  const calculatedBreakdown = breakdown || {
    housing: Math.round(((profile.electricity * 0.85) + (profile.gas * 2.3)) * 12),
    travel: Math.round(((profile.carKm * 0.2) + (profile.flights * 400) / 12) * 12),
    lifestyle: Math.round((profile.diet === 'Vegan' ? 100 : profile.diet === 'Vegetarian' ? 150 : 250) * 12)
  };

  const totalBreakdown = calculatedBreakdown.housing + calculatedBreakdown.travel + calculatedBreakdown.lifestyle || 1;
  const pctHousing = Math.round((calculatedBreakdown.housing / totalBreakdown) * 100);
  const pctTravel = Math.round((calculatedBreakdown.travel / totalBreakdown) * 100);
  const pctLifestyle = Math.round((calculatedBreakdown.lifestyle / totalBreakdown) * 100);

  return (
    <div className="space-y-6">
      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Eco-Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track, analyze, and offset your carbon footprint using intelligent insights.
          </p>
        </div>
        
        {hasData && (
          <div className="flex items-center space-x-3 bg-emerald-950/40 border border-emerald-900/30 px-4 py-2 rounded-xl text-emerald-450 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Current Standing: R-#{userRank} ({userBadge})</span>
          </div>
        )}
      </div>

      {/* Lifetime Analytics Card */}
      {logs.length > 0 && (
        <TiltCard className="bg-emerald-950/60 border border-emerald-500/30 text-white rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-700/20 rounded-full filter blur-3xl opacity-25 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-850/20 rounded-full filter blur-3xl opacity-20 -ml-20 -mb-20"></div>
          <div className="z-10 preserve-3d">
            <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider translate-z-10">Total Lifetime Carbon Footprint Saved/Generated</h3>
            <div className="text-3xl font-black mt-1 flex items-baseline translate-z-20">
              <AnimatedCounter value={logs.reduce((sum, log) => sum + log.calculatedScore, 0) / 1000} decimals={2} />
              <span className="text-base font-normal text-emerald-350 ml-1.5">tonnes CO₂</span>
            </div>
            <p className="text-emerald-300/80 text-xs mt-1 font-medium translate-z-10">Accumulated over {logs.length} calculation logs saved on your device.</p>
          </div>
          <div className="flex space-x-6 z-10 translate-z-10">
            <div className="border-l border-emerald-500/30 pl-6">
              <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Total Entries</div>
              <div className="text-2xl font-black mt-0.5"><AnimatedCounter value={logs.length} /></div>
            </div>
            <div className="border-l border-emerald-500/30 pl-6">
              <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Eco Achievements</div>
              <div className="text-2xl font-black mt-0.5"><AnimatedCounter value={profile.completedChallenges.length} /></div>
            </div>
          </div>
        </TiltCard>
      )}

      {/* Main Content Area */}
      {!hasData ? (
        /* Empty State / Call to Action */
        <TiltCard className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-950/20 rounded-full filter blur-3xl opacity-40 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-950/20 rounded-full filter blur-3xl opacity-40 -ml-20 -mb-20"></div>
          
          <div className="max-w-2xl mx-auto space-y-6 relative z-10 preserve-3d">
            <div className="mx-auto w-16 h-16 bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-450 animate-bounce translate-z-30">
              <Footprints size={32} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white translate-z-20">
              Discover Your Carbon Footprint
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base translate-z-10">
              Answer a few simple questions about your home energy, daily transit, and eating habits. 
              We'll calculate your impact, output AI personalized insights, and suggest target challenges to reduce your score.
            </p>
            <button
              onClick={() => onNavigate('calculator')}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md hover:shadow-emerald-600/20 transition-all duration-150 translate-z-20"
            >
              <span>Launch Calculator</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </TiltCard>
      ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual Gauge Widget - Left column */}
          <ErrorBoundary fallbackTitle="Carbon Gauge Widget Failed">
            <TiltCard className="rounded-3xl p-6 flex flex-col justify-between items-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-300">Carbon Level</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${impactColor}`}>
                  {impactLevel}
                </span>
              </div>

              {/* Gauge SVG */}
              <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden mt-4">
                {/* Semi circle track */}
                <svg width="180" height="180" className="absolute top-0">
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 90 A 70 70 0 0 1 160 90"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 20 90 A 70 70 0 0 1 160 90"
                    fill="none"
                    stroke="url(#gauge-grad)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="220"
                    strokeDashoffset="0"
                    opacity="0.9"
                  />
                </svg>
                {/* Needle */}
                <div 
                  className="absolute bottom-0 w-2 h-16 bg-white origin-bottom rounded-t-full transition-transform duration-1000 ease-out"
                  style={{ 
                    transform: `rotate(${gaugeAngle}deg)`, 
                    bottom: '0px',
                    transformOrigin: '50% 100%',
                    zIndex: 10
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-sm"></div>
                </div>

                {/* Projected Needle */}
                {simulatedAnnualScore !== annualScore && (
                  <div 
                    className="absolute bottom-0 w-2 h-16 bg-blue-500 origin-bottom rounded-t-full transition-transform duration-300 ease-out opacity-85"
                    style={{ 
                      transform: `rotate(${simulatedGaugeAngle}deg)`, 
                      bottom: '0px',
                      transformOrigin: '50% 100%',
                      zIndex: 9
                    }}
                    title={`Projected Score: ${(simulatedAnnualScore / 1000).toFixed(1)} tonnes`}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                  </div>
                )}

                <div className="absolute bottom-0 w-8 h-4 bg-slate-800 border-t border-x border-slate-700 rounded-t-full"></div>
              </div>

              {/* Score value display */}
              <div className="text-center mt-2">
                <div className="flex items-baseline justify-center space-x-1.5 text-white">
                  <span className="text-4xl font-extrabold tracking-tight">
                    <AnimatedCounter value={annualScore / 1000} decimals={1} />
                  </span>
                  {simulatedAnnualScore !== annualScore && (
                    <>
                      <span className="text-slate-450 text-lg font-semibold mx-1">→</span>
                      <span className="text-4xl font-extrabold text-blue-400 tracking-tight">
                        <AnimatedCounter value={simulatedAnnualScore / 1000} decimals={1} />
                      </span>
                    </>
                  )}
                  <span className="text-sm font-semibold text-slate-400 ml-1">tonnes CO₂/yr</span>
                </div>
                {simulatedAnnualScore !== annualScore && (
                  <div className="text-[10px] text-blue-400 font-bold mt-1 uppercase tracking-wider">
                    Projected: {simulatedImpactLevel}
                  </div>
                )}
              </div>

              {/* Reduction stat */}
              <div className="w-full mt-6 pt-4 border-t border-slate-800 flex flex-col space-y-1 text-xs font-medium text-slate-400">
                <div className="flex justify-between">
                  <span>Original Baseline: {(originalScore / 1000).toFixed(1)} t</span>
                  <span className="text-emerald-450 font-semibold flex items-center">
                    Goals Reduced: -<AnimatedCounter value={carbonReduced / 1000} decimals={1} /> t
                  </span>
                </div>
                {simulatedAnnualScore !== annualScore && (
                  <div className="flex justify-between text-blue-400 font-semibold border-t border-slate-800 pt-1 mt-1">
                    <span>Simulated Savings:</span>
                    <span className="flex items-center">-<AnimatedCounter value={simulatedAnnualSavings / 1000} decimals={1} /> t</span>
                  </div>
                )}
              </div>
            </TiltCard>
          </ErrorBoundary>

          {/* Source Breakdown (Middle column) */}
          <ErrorBoundary fallbackTitle="Emissions Breakdown Widget Failed">
            <TiltCard className="rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-350">Emissions Breakdown</span>
                  <span className="text-xs text-slate-550">By Sector</span>
                </div>

                {/* Graphical representation */}
                <div className="space-y-4 my-4">
                  {/* Housing */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center space-x-1">
                        <Zap size={14} className="text-emerald-450 mr-1" />
                        Housing
                      </span>
                      <span className="text-slate-400">{(calculatedBreakdown.housing / 1000).toFixed(1)} t ({pctHousing}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctHousing}%` }}></div>
                    </div>
                  </div>

                  {/* Travel */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center space-x-1">
                        <Car size={14} className="text-emerald-450 mr-1" />
                        Travel
                      </span>
                      <span className="text-slate-400">{(calculatedBreakdown.travel / 1000).toFixed(1)} t ({pctTravel}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${pctTravel}%` }}></div>
                    </div>
                  </div>

                  {/* Lifestyle */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center space-x-1">
                        <Compass size={14} className="text-emerald-450 mr-1" />
                        Diet & Lifestyle
                      </span>
                      <span className="text-slate-400">{(calculatedBreakdown.lifestyle / 1000).toFixed(1)} t ({pctLifestyle}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-300 h-full rounded-full transition-all duration-500" style={{ width: `${pctLifestyle}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('insights')}
                className="w-full mt-4 inline-flex items-center justify-center space-x-2 py-2.5 text-emerald-350 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-900/50 text-xs font-bold rounded-xl transition-all"
              >
                <span>Explore AI Insights</span>
                <ArrowRight size={14} />
              </button>
            </TiltCard>
          </ErrorBoundary>

          {/* Gamified Summary & Points (Right column) */}
          <ErrorBoundary fallbackTitle="Achievements Widget Failed">
            <TiltCard className="rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-355">Eco-Points & Achievements</span>
                  <span className="text-xs text-slate-550">Level Progression</span>
                </div>

                {/* Point Status */}
                <div className="flex items-center space-x-4 py-3 bg-emerald-950/40 rounded-2xl px-4 border border-emerald-900/40">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900/50 flex items-center justify-center text-emerald-450">
                    <Award size={26} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white"><AnimatedCounter value={profile.points} /> Points</div>
                    <div className="text-xs text-slate-400">Total Eco Points earned</div>
                  </div>
                </div>

                {/* Active Challenges counts */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="border border-slate-800 rounded-xl p-3 text-center bg-slate-900/20">
                    <div className="text-xl font-bold text-white"><AnimatedCounter value={profile.completedChallenges.length} /></div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Challenges Done</div>
                  </div>
                  <div className="border border-slate-800 rounded-xl p-3 text-center bg-slate-900/20">
                    <div className="text-xl font-bold text-white">
                      <AnimatedCounter value={Math.max(0, 6 - profile.completedChallenges.length)} />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Available Tasks</div>
                  </div>
                </div>
              </div>

              {/* Quick Challenge Link */}
              <div className="mt-4 pt-4 border-t border-slate-850">
                <div className="text-[11px] text-slate-450 mb-2 font-medium">Next level unlocks at 300 points. Check out your AI weekly insights for challenges:</div>
                <button
                  onClick={() => onNavigate('insights')}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  <span>Go to Challenges</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </TiltCard>
          </ErrorBoundary>
        </div>
      )}

      {/* Interactive What-If Simulator Card */}
      {hasData && (
        <ErrorBoundary fallbackTitle="Simulator Panel Failed">
          <TiltCard className="bg-slate-900/50 backdrop-blur-md text-white rounded-3xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-10 -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full filter blur-3xl opacity-10 -ml-20 -mb-20"></div>
            
            <div className="relative z-10 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span className="text-lg">🔮</span>
                    <span>Interactive 'What-If' Carbon Reduction Simulator</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Adjust behavior sliders to simulate real-time carbon reduction projections.
                  </p>
                </div>
                {(drivingReduction > 0 || acHours > 0 || plantBasedDays > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrivingReduction(0);
                      setAcHours(0);
                      setPlantBasedDays(0);
                    }}
                    className="mt-3 sm:mt-0 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
                  >
                    Reset Simulation
                  </button>
                )}
              </div>

              {/* Content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Sliders Column */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Driver reduction */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                        <Car size={14} className="text-emerald-400" />
                        <span>Reduce Driving Mileage</span>
                      </label>
                      <span className="text-xs font-bold text-blue-400">{drivingReduction}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={drivingReduction}
                      onChange={(e) => setDrivingReduction(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Baseline: {Math.round(profile.carKm || 0)} km/mo</span>
                      <span>Projected Saved: {Math.round((drivingReduction / 100) * (profile.carKm || 0))} km/mo</span>
                    </div>
                  </div>

                  {/* AC / Electricity usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                        <Zap size={14} className="text-amber-400" />
                        <span>Reduce AC/Electricity Usage</span>
                      </label>
                      <span className="text-xs font-bold text-blue-400">{acHours} hours/day</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="1"
                      value={acHours}
                      onChange={(e) => setAcHours(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Baseline: {Math.round(profile.electricity || 0)} kWh/mo</span>
                      <span>Projected Saved: {Math.round(Math.min(profile.electricity || 0, acHours * 1.5 * 30.5))} kWh/mo</span>
                    </div>
                  </div>

                  {/* Shift to Plant-based meals */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                        <Footprints size={14} className="text-emerald-450" />
                        <span>Shift to Plant-Based Diet</span>
                      </label>
                      <span className="text-xs font-bold text-blue-400">{plantBasedDays} days/week</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      step="1"
                      value={plantBasedDays}
                      onChange={(e) => setPlantBasedDays(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      disabled={profile.diet === 'Vegan'}
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Baseline: {profile.diet}</span>
                      <span>
                        {profile.diet === 'Vegan' 
                          ? 'Already 100% Plant-Based!' 
                          : `Projected Shift: ${plantBasedDays} days/wk`}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Projections Column */}
                <div className="lg:col-span-2 bg-slate-950/55 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulated Results</div>
                    
                    {/* Projected Monthly Savings */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300">Projected Monthly Savings</span>
                      <span className="text-sm font-bold text-emerald-400">+{Math.round(simulatedMonthlySavings)} kg CO₂</span>
                    </div>

                    {/* Projected Annual Savings */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300">Projected Annual Savings</span>
                      <span className="text-sm font-extrabold text-emerald-400">+{Math.round(simulatedAnnualSavings)} kg CO₂</span>
                    </div>

                    <hr className="border-slate-800" />

                    {/* Projected Footprint */}
                    <div className="space-y-1">
                      <div className="text-xs text-slate-300 font-semibold">Simulated Carbon Footprint</div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-white">{(simulatedAnnualScore / 1000).toFixed(2)}</span>
                        <span className="text-xs text-slate-400">tonnes/yr</span>
                      </div>
                    </div>
                  </div>

                  {/* Reduction Percentage Badge */}
                  {simulatedAnnualSavings > 0 ? (
                    <div className="bg-emerald-950/50 border border-emerald-800/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Estimated Reduction</div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {((simulatedAnnualSavings / Math.max(1, profile.carbonScore)) * 100).toFixed(1)}% cut
                        </div>
                      </div>
                      <span className="text-xl">🍃</span>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-500">
                      Drag the sliders to view potential cuts
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TiltCard>
        </ErrorBoundary>
      )}

      {/* Historical Trend Chart */}
      {hasData && logs.length > 0 && isMounted && (
        <ViewportSection height="340px">
          <TiltCard className="glass-3d-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Activity size={18} className="text-emerald-450" />
                <span>Historical Carbon Footprint Trend</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Dynamic Redraw Enabled</span>
            </div>
            <DynamicTrendChart 
              logs={logs}
              acHours={acHours}
              drivingReduction={drivingReduction}
              plantBasedDays={plantBasedDays}
            />
          </TiltCard>
        </ViewportSection>
      )}

      {/* Dynamic Achievements & Badges Section */}
      {hasData && (
        <ViewportSection height="240px">
          {(() => {
            const travelCompleted = profile.completedChallenges.filter(id => {
              const c = challenges.find(item => item.id === id);
              return c && c.category === 'Travel';
            }).length;
            
            const totalCompleted = profile.completedChallenges.length;

            const badgesList = [
              {
                id: 'green-warrior',
                name: 'Green Warrior',
                description: 'Maintain a carbon footprint under 6.0 tonnes CO₂/yr.',
                unlocked: profile.hasCalculated && profile.carbonScore < 6000,
                progress: profile.hasCalculated ? Math.min(100, Math.round((6000 / Math.max(1, profile.carbonScore)) * 100)) : 0,
                progressText: profile.hasCalculated ? `${(profile.carbonScore / 1000).toFixed(1)}t / 6.0t` : '0.0t / 6.0t',
                icon: '🍃'
              },
              {
                id: 'co2-cutter',
                name: 'CO2 Cutter',
                description: 'Complete 3 or more travel challenges.',
                unlocked: travelCompleted >= 3,
                progress: Math.min(100, Math.round((travelCompleted / 3) * 100)),
                progressText: `${travelCompleted} / 3 goals`,
                icon: '⚡'
              },
              {
                id: 'eco-guardian',
                name: 'Eco Guardian',
                description: 'Accumulate 200 or more Eco Points.',
                unlocked: profile.points >= 200,
                progress: Math.min(100, Math.round((profile.points / 200) * 100)),
                progressText: `${profile.points} / 200 pts`,
                icon: '🛡️'
              },
              {
                id: 'zero-hero',
                name: 'Zero Hero',
                description: 'Complete 4 or more eco-challenges.',
                unlocked: totalCompleted >= 4,
                progress: Math.min(100, Math.round((totalCompleted / 4) * 100)),
                progressText: `${totalCompleted} / 4 tasks`,
                icon: '👑'
              }
            ];

            return (
              <div className="glass-3d-card rounded-3xl p-6 space-y-4 preserve-3d">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Award size={18} className="text-emerald-450 animate-pulse-soft" />
                    <span>Eco Achievements & Badges</span>
                  </h3>
                  <span className="text-xs text-slate-550">Live Reward System</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {badgesList.map(badge => (
                    <TiltCard 
                      key={badge.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-40 ${
                        badge.unlocked 
                          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg scale-100 hover:scale-[1.02] animate-float-badge' 
                          : 'border-slate-800 bg-slate-900/10 grayscale opacity-40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="preserve-3d">
                          <span className="text-2xl mb-1 block translate-z-20">{badge.icon}</span>
                          <h4 className="text-xs font-bold text-white tracking-tight translate-z-10">{badge.name}</h4>
                          <p className="text-[10px] text-slate-450 leading-snug mt-1 max-w-[130px]">{badge.description}</p>
                        </div>
                        {badge.unlocked && (
                          <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded animate-bounce">Unlocked</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-450">
                          <span>Progress</span>
                          <span>{badge.progressText}</span>
                        </div>
                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${badge.unlocked ? 'bg-emerald-500' : 'bg-slate-700'}`} 
                            style={{ width: `${badge.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              </div>
            );
          })()}
        </ViewportSection>
      )}

      {/* Highlights / Educational Section (Stunning Glassmorphism) */}
      <TiltCard className="glass-3d-card rounded-3xl p-6 relative overflow-hidden">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-3">
          <Flame size={18} className="text-emerald-450" />
          <span>Eco-Tips of the Week</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">💡 Smart Heating/Cooling</h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Lowering your thermostat by just 1 degree Celsius can reduce your home energy bill and carbon footprints by up to 10% annually.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">🥦 Plant-focused Diet</h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Choosing a vegetarian meal just once a day saves approximately 3,000 liters of water and 2.5 kg of CO₂ equivalent emissions.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">🚲 Active Commutes</h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Half of all short commuting trips are under 5km. Swapping these with a bicycle avoids fuel expenses and cuts transit emissions to zero.
            </p>
          </div>
        </div>
      </TiltCard>

      {/* History Table */}
      {logs.length > 0 && (
        <ErrorBoundary fallbackTitle="Logs Database Connection Failed">
          <TiltCard className="glass-3d-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar size={18} className="text-emerald-450" />
                <span>Recent Calculation Logs</span>
              </h3>
              <span className="text-xs text-slate-500">SQL Relational Database</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Electricity</th>
                    <th className="py-2.5 px-3">Travel</th>
                    <th className="py-2.5 px-3">Diet Type</th>
                    <th className="py-2.5 px-3 text-right">Calculated Score</th>
                    {onDeleteLog && <th className="py-2.5 px-3 text-right w-12">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-slate-350 hover:bg-slate-800/25 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{log.date}</td>
                      <td className="py-3 px-3">{log.electricity} kWh</td>
                      <td className="py-3 px-3">{log.travel} km</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.diet === 'Vegan' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/30' :
                          log.diet === 'Vegetarian' ? 'text-teal-400 bg-teal-950/40 border border-teal-900/30' : 'text-slate-400 bg-slate-900/40 border border-slate-800'
                        }`}>
                          {log.diet}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">{Math.round(log.calculatedScore)} kg CO₂</td>
                      {onDeleteLog && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteLog(log.id)}
                            className="text-slate-400 hover:text-rose-450 p-1 rounded-lg hover:bg-rose-950/30 transition-colors"
                            title="Delete log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TiltCard>
        </ErrorBoundary>
      )}
    </div>
  );
}
