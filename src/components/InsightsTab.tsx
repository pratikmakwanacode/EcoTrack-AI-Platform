import React, { useState } from 'react';
import { Sparkles, CheckSquare, Square, Trash2, Trophy, ArrowRight, ShieldCheck, Flame, Compass, Car, Zap, Activity } from 'lucide-react';
import { UserProfile, Challenge } from '@/lib/db';

interface InsightsTabProps {
  profile: UserProfile;
  challenges: Challenge[];
  onToggleChallenge: (challengeId: string, completed: boolean) => Promise<void>;
  onNavigate: (tab: 'dashboard' | 'calculator' | 'insights' | 'leaderboard') => void;
  aiAnalysis?: string;
}

export default function InsightsTab({ profile, challenges, onToggleChallenge, onNavigate, aiAnalysis }: InsightsTabProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!profile.hasCalculated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 glass-3d-card rounded-3xl p-8 shadow-sm">
        <div className="mx-auto w-16 h-16 bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-400 mb-6">
          <Sparkles size={30} />
        </div>
        <h2 className="text-xl font-bold text-white">Analyze Your Footprint First</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Please run the calculator and compute your carbon footprint to receive personalized AI Insights and customized challenges.
        </p>
        <button
          onClick={() => onNavigate('calculator')}
          className="mt-6 inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md"
        >
          <span>Calculate Now</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // Calculate breakdown to determine highest source
  const housingEmissions = Math.round(((profile.electricity * 0.85) + (profile.gas * 2.3)) * 12);
  const travelEmissions = Math.round(((profile.carKm * 0.2) + (profile.flights * 400) / 12) * 12);
  
  let dietScore = 250;
  if (profile.diet === 'Vegan') dietScore = 100;
  else if (profile.diet === 'Vegetarian') dietScore = 150;
  const lifestyleEmissions = dietScore * 12;

  const totalEmissions = housingEmissions + travelEmissions + lifestyleEmissions || 1;

  // Determine highest source
  let highestSource = 'Housing';
  let highestEmissions = housingEmissions;
  let highestPct = Math.round((housingEmissions / totalEmissions) * 100);
  let categoryIcon = <Zap size={18} className="text-emerald-600" />;
  let aiRecommendation = '';

  if (travelEmissions > housingEmissions && travelEmissions > lifestyleEmissions) {
    highestSource = 'Travel';
    highestEmissions = travelEmissions;
    highestPct = Math.round((travelEmissions / totalEmissions) * 100);
    categoryIcon = <Car size={18} className="text-emerald-600" />;
  } else if (lifestyleEmissions > housingEmissions && lifestyleEmissions > travelEmissions) {
    highestSource = 'Diet & Lifestyle';
    highestEmissions = lifestyleEmissions;
    highestPct = Math.round((lifestyleEmissions / totalEmissions) * 100);
    categoryIcon = <Compass size={18} className="text-emerald-600" />;
  }

  // Set recommendation texts based on source
  if (highestSource === 'Housing') {
    aiRecommendation = "Your energy utilities represent the largest share of your carbon impact. Consider optimizing home temperature, switching to smart LED fixtures, or requesting a renewable energy utility plan from your provider.";
  } else if (highestSource === 'Travel') {
    aiRecommendation = "Vehicle transportation and flight trips constitute the majority of your emissions. Swapping short commutes to active walking/cycling, carpooling, or bundle-scheduling flights could cut these numbers in half.";
  } else {
    aiRecommendation = "Diet choice is your principal driver. Livestock agricultural production is highly resource-intensive. Lowering dairy intake or choosing meat-free days weekly will make a significant impact.";
  }

  if (aiAnalysis) {
    aiRecommendation = aiAnalysis;
  }

  // Handle challenge toggle
  const handleCheckboxClick = async (id: string, currentlyCompleted: boolean) => {
    setTogglingId(id);
    await onToggleChallenge(id, !currentlyCompleted);
    setTogglingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
          <Sparkles size={28} className="text-emerald-450 mr-2.5 animate-pulse-soft" />
          AI Insights & Challenges
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Receive tailored strategies and complete eco-challenges to track your carbon score drop.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Breakdown Analysis */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-3d-card rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-950/20 rounded-full filter blur-2xl opacity-50"></div>
            
            <h2 className="text-base font-bold text-white flex items-center mb-4">
              <Sparkles size={16} className="text-emerald-450 mr-1.5" />
              AI Impact Diagnostics
            </h2>

            {/* Diagnosis display */}
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-900/30 rounded-2xl p-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">
                  {categoryIcon}
                  <span>Highest Source: {highestSource}</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {highestPct}% <span className="text-sm font-normal text-slate-400">of footprint</span>
                </div>
              </div>

              <div className="text-xs text-slate-350 leading-relaxed space-y-2">
                <p className="font-medium text-slate-200">Diagnosis Details:</p>
                <p>{aiRecommendation}</p>
              </div>
            </div>

            {/* Diagnostics Stats */}
            <div className="mt-6 pt-4 border-t border-slate-850 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450">Original Baseline:</span>
                <span className="font-semibold text-slate-200">{(profile.originalScore / 1000).toFixed(1)} t CO₂/yr</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-455">Current Adjusted:</span>
                <span className="font-bold text-emerald-400">{(profile.carbonScore / 1000).toFixed(1)} t CO₂/yr</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-455">Earned Points:</span>
                <span className="font-bold text-amber-400">{profile.points} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-3d-card rounded-3xl p-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Actionable Eco-Challenges</h2>
                <p className="text-[11px] text-slate-450 mt-0.5">Toggle checkboxes to claim points and cut score.</p>
              </div>
              <div className="flex items-center space-x-1.5 bg-amber-950/40 text-amber-405 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-900/30">
                <Trophy size={14} />
                <span>Rank: #{profile.points >= 300 ? 1 : profile.points >= 200 ? 2 : profile.points >= 100 ? 3 : 7}</span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3.5">
              {challenges.map(chal => {
                const isCompleted = profile.completedChallenges.includes(chal.id);
                const isToggling = togglingId === chal.id;

                // Category tag style
                let catIcon = <Zap size={12} />;
                let catStyle = 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/30';
                if (chal.category === 'Travel') {
                  catIcon = <Car size={12} />;
                  catStyle = 'text-sky-400 bg-sky-950/50 border border-sky-900/30';
                } else if (chal.category === 'Lifestyle') {
                  catIcon = <Compass size={12} />;
                  catStyle = 'text-amber-400 bg-amber-950/50 border border-amber-900/30';
                }

                return (
                  <div 
                    key={chal.id}
                    className={`flex items-start space-x-4 p-4 rounded-2xl border transition-all duration-150 ${isCompleted ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-850 bg-slate-900/20 hover:bg-slate-900/40'}`}
                  >
                    {/* Checkbox button */}
                    <button
                      disabled={isToggling}
                      onClick={() => handleCheckboxClick(chal.id, isCompleted)}
                      className={`mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg border transition-all ${isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-700 hover:border-emerald-600 bg-slate-900/40 text-transparent'}`}
                    >
                      <CheckSquare size={16} className={isCompleted ? 'block' : 'hidden'} />
                    </button>

                    {/* Content Details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {chal.title}
                        </span>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${catStyle}`}>
                          {catIcon}
                          <span className="ml-1">{chal.category}</span>
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{chal.description}</p>
                      
                      {/* Points / Carbon tags */}
                      <div className="flex items-center space-x-3 pt-1 text-[10px] font-semibold">
                        <span className="text-amber-400">+{chal.points} pts</span>
                        <span className="text-emerald-400">-{chal.carbonReduction} kg CO₂ / year</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
