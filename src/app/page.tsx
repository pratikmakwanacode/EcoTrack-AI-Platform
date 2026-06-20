"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, Sparkles, Trophy, Menu, X, Leaf, Award } from 'lucide-react';
import SimpleEcoLogin from '@/components/SimpleEcoLogin';
import { UserProfile, LeaderboardUser, Challenge } from '@/lib/db';
import DashboardTab, { EcoLog } from '@/components/DashboardTab';
import dynamic from 'next/dynamic';

const CalculatorTab = dynamic(() => import('@/components/CalculatorTab'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-slate-900/20 border border-slate-850 rounded-3xl p-8 h-96 flex items-center justify-center text-slate-400 font-semibold">
      Loading Calculator...
    </div>
  )
});

const InsightsTab = dynamic(() => import('@/components/InsightsTab'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-slate-900/20 border border-slate-850 rounded-3xl p-8 h-96 flex items-center justify-center text-slate-400 font-semibold">
      Loading AI Insights...
    </div>
  )
});

const LeaderboardTab = dynamic(() => import('@/components/LeaderboardTab'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-slate-900/20 border border-slate-850 rounded-3xl p-8 h-96 flex items-center justify-center text-slate-400 font-semibold">
      Loading Leaderboard Standings...
    </div>
  )
});

import { useAuth } from '@/components/AuthContext';
import { useNotification } from '@/components/NotificationContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculator' | 'insights' | 'leaderboard'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<{ database: string; geminiApi: string; healthy: boolean } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // mounted guard: prevents SSR/client hydration mismatch on auth-gated loading states
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHealthStatus(data);
        } else {
          const data = await res.json().catch(() => null);
          setHealthStatus(data || { database: 'offline', geminiApi: 'offline', healthy: false });
        }
      } catch (err) {
        setHealthStatus({ database: 'offline', geminiApi: 'offline', healthy: false });
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-login session synchronization hook deleted to enforce full login gateway

  // States fetched from backend API or localStorage
  const [profile, setProfile] = useState<UserProfile>({
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
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [breakdown, setBreakdown] = useState<{ housing: number; travel: number; lifestyle: number } | null>(null);
  const [logs, setLogs] = useState<EcoLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  // Format date helper (DD-MM-YYYY)
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch initial profile, challenges and leaderboard
  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    const currentUserId = user.userId;
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch footprint logs from SQL database via API
        const logsRes = await fetch('/api/footprint', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let currentLogs: EcoLog[] = [];
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          if (logsData.success && Array.isArray(logsData.logs)) {
            currentLogs = logsData.logs;
            setLogs(currentLogs);
          }
        }

        // 2. Load profile: Completed challenges and points are kept in localStorage
        const storedProfile = localStorage.getItem(`ecoUserProfile_${currentUserId}`);
        let activeProfile = {
          hasCalculated: false,
          electricity: 0,
          gas: 0,
          carKm: 0,
          flights: 0,
          diet: 'Non-Vegetarian' as const,
          carbonScore: 0,
          originalScore: 0,
          points: 0,
          completedChallenges: []
        };

        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          activeProfile = parsed;
        }

        // Synchronize user profile carbon stats from the latest log in SQL database
        if (currentLogs.length > 0) {
          const latestLog = currentLogs[0];
          
          // Calculate reduction points from completed challenges
          let activeReduction = 0;
          const currentCompleted = activeProfile.completedChallenges || [];
          
          const chalRes = await fetch('/api/challenges', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          let activeChallengesList: Challenge[] = [];
          if (chalRes.ok) {
            const chalData = await chalRes.json();
            activeChallengesList = chalData.challenges;
            setChallenges(chalData.challenges);
          }

          currentCompleted.forEach((cid: string) => {
            const chal = activeChallengesList.find(c => c.id === cid);
            if (chal) activeReduction += chal.carbonReduction;
          });

          activeProfile = {
            ...activeProfile,
            hasCalculated: true,
            electricity: latestLog.electricity,
            gas: 0,
            carKm: latestLog.travel,
            flights: 0,
            diet: latestLog.diet as any,
            originalScore: latestLog.calculatedScore,
            carbonScore: Math.max(0, latestLog.calculatedScore - activeReduction)
          };
          
          // Custom breakdown object for sector statistics
          setBreakdown({
            housing: Math.round(latestLog.electricity * 0.85 * 12),
            travel: Math.round(latestLog.travel * 0.2 * 12),
            lifestyle: Math.round((latestLog.diet === 'Vegan' ? 100 : latestLog.diet === 'Vegetarian' ? 150 : 250) * 12)
          });

          // Fetch dynamic AI insights diagnostics for the latest log
          try {
            const aiRes = await fetch('/api/ai-insights', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                electricity: latestLog.electricity,
                travel: latestLog.travel,
                diet: latestLog.diet,
                score: latestLog.calculatedScore
              })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              if (aiData.success) {
                setChallenges(aiData.challenges);
                setAiAnalysis(aiData.breakdownAnalysis);
                showNotification("AI Diagnostics parsed successfully from Gemini engine", "success");
              } else {
                showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
              }
            } else {
              showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
            }
          } catch (err) {
            console.error("AI Insights fetch failed on load:", err);
            showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
          }
        } else {
          activeProfile = {
            ...activeProfile,
            hasCalculated: false,
            electricity: 0,
            gas: 0,
            carKm: 0,
            flights: 0,
            diet: 'Non-Vegetarian',
            carbonScore: 0,
            originalScore: 0
          };
          setBreakdown(null);
        }

        setProfile(activeProfile);
        localStorage.setItem(`ecoUserProfile_${currentUserId}`, JSON.stringify(activeProfile));

        // 3. Load leaderboard (aggregating live server-side standings from SQL logs)
        const leadRes = await fetch('/api/leaderboard/live', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          
          // Inject current user points into aggregate standings
          const syncedLeaderboard = leadData.map((leadUser: LeaderboardUser) => {
            if (leadUser.isCurrentUser || leadUser.userId === currentUserId) {
              return {
                ...leadUser,
                isCurrentUser: true,
                points: activeProfile.points,
                carbonScore: activeProfile.carbonScore,
                badge: activeProfile.points >= 300 ? 'Eco Champion' : activeProfile.points >= 200 ? 'Green Advocate' : activeProfile.points >= 100 ? 'Carbon Cutter' : 'Beginner'
              };
            }
            return leadUser;
          });

          syncedLeaderboard.sort((a: any, b: any) => b.points - a.points);
          syncedLeaderboard.forEach((leadUser: any, idx: number) => { leadUser.rank = idx + 1; });
          setLeaderboard(syncedLeaderboard);
        }

      } catch (err) {
        console.error("Error loading mock database data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, user]);

  // Handle calculator submission callback
  const handleCalculationSuccess = async (data: { success: boolean; log: EcoLog }) => {
    if (!token || !user) return;
    const currentUserId = user.userId;
    // Append new log to state
    const updatedLogs = [data.log, ...logs];
    setLogs(updatedLogs);

    // Calculate completed challenges reductions
    let activeReduction = 0;
    profile.completedChallenges.forEach(id => {
      const chal = challenges.find(c => c.id === id);
      if (chal) activeReduction += chal.carbonReduction;
    });

    const updatedProfile: UserProfile = {
      ...profile,
      hasCalculated: true,
      electricity: data.log.electricity,
      gas: 0,
      carKm: data.log.travel,
      flights: 0,
      diet: data.log.diet as any,
      originalScore: data.log.calculatedScore,
      carbonScore: Math.max(0, data.log.calculatedScore - activeReduction)
    };
    setProfile(updatedProfile);
    localStorage.setItem(`ecoUserProfile_${currentUserId}`, JSON.stringify(updatedProfile));

    setBreakdown({
      housing: Math.round(data.log.electricity * 0.85 * 12),
      travel: Math.round(data.log.travel * 0.2 * 12),
      lifestyle: Math.round((data.log.diet === 'Vegan' ? 100 : data.log.diet === 'Vegetarian' ? 150 : 250) * 12)
    });

    // Fetch live AI recommendations dynamically
    try {
      const aiRes = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          electricity: data.log.electricity,
          travel: data.log.travel,
          diet: data.log.diet,
          score: data.log.calculatedScore
        })
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.success) {
          setChallenges(aiData.challenges);
          setAiAnalysis(aiData.breakdownAnalysis);
          showNotification("AI Diagnostics parsed successfully from Gemini engine", "success");
        } else {
          showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
        }
      } else {
        showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
      }
    } catch (err) {
      console.error("AI insights generation failed:", err);
      showNotification("Gemini API unavailable, heuristic backup recommendations loaded", "warning");
    }

    // Refresh leaderboard
    const leadRes = await fetch('/api/leaderboard/live', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (leadRes.ok) {
      const leadData = await leadRes.json();
      
      const syncedLeaderboard = leadData.map((leadUser: LeaderboardUser) => {
        if (leadUser.isCurrentUser || leadUser.userId === currentUserId) {
          return {
            ...leadUser,
            isCurrentUser: true,
            points: updatedProfile.points,
            carbonScore: updatedProfile.carbonScore,
            badge: updatedProfile.points >= 300 ? 'Eco Champion' : updatedProfile.points >= 200 ? 'Green Advocate' : updatedProfile.points >= 100 ? 'Carbon Cutter' : 'Beginner'
          };
        }
        return leadUser;
      });

      syncedLeaderboard.sort((a: any, b: any) => b.points - a.points);
      syncedLeaderboard.forEach((leadUser: any, idx: number) => { leadUser.rank = idx + 1; });
      setLeaderboard(syncedLeaderboard);
    }

    setActiveTab('dashboard'); // Redirect to dashboard
  };

  // Toggle challenge completion
  const handleToggleChallenge = async (challengeId: string, completed: boolean) => {
    if (!token || !user) return;
    const currentUserId = user.userId;
    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ challengeId, completed })
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        setLeaderboard(data.leaderboard);

        // Sync to localStorage
        localStorage.setItem(`ecoUserProfile_${currentUserId}`, JSON.stringify(data.profile));
        showNotification("Challenge progress updated in SQL database", "success");
      } else {
        showNotification(`Failed to record challenge toggle: ${data.error}`, "error");
      }
    } catch (err) {
      console.error("Failed to sync challenge with API:", err);
      showNotification("Failed to record challenge toggle", "error");
    }
  };

  // Delete a history log entry in SQL database
  const handleDeleteLog = async (id: number) => {
    if (!token || !user) return;
    const currentUserId = user.userId;
    try {
      const res = await fetch('/api/footprint', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logId: id })
      });
      
      const resData = await res.json();
      if (res.ok && resData.success) {
        const updatedLogs = logs.filter(log => log.id !== id);
        setLogs(updatedLogs);

        let updatedProfile = { ...profile };

        if (updatedLogs.length === 0) {
          updatedProfile = {
            ...profile,
            hasCalculated: false,
            electricity: 0,
            gas: 0,
            carKm: 0,
            flights: 0,
            diet: 'Non-Vegetarian',
            carbonScore: 0,
            originalScore: 0
          };
          setBreakdown(null);
        } else {
          // Set profile to next latest log
          const latestLog = updatedLogs[0];
          let activeReduction = 0;
          profile.completedChallenges.forEach(cid => {
            const chal = challenges.find(c => c.id === cid);
            if (chal) activeReduction += chal.carbonReduction;
          });

          updatedProfile = {
            ...profile,
            hasCalculated: true,
            electricity: latestLog.electricity,
            gas: 0,
            carKm: latestLog.travel,
            flights: 0,
            diet: latestLog.diet as any,
            originalScore: latestLog.calculatedScore,
            carbonScore: Math.max(0, latestLog.calculatedScore - activeReduction)
          };

          setBreakdown({
            housing: Math.round(latestLog.electricity * 0.85 * 12),
            travel: Math.round(latestLog.travel * 0.2 * 12),
            lifestyle: Math.round((latestLog.diet === 'Vegan' ? 100 : latestLog.diet === 'Vegetarian' ? 150 : 250) * 12)
          });
        }

        setProfile(updatedProfile);
        localStorage.setItem(`ecoUserProfile_${currentUserId}`, JSON.stringify(updatedProfile));

        // Refresh leaderboard
        const leadRes = await fetch('/api/leaderboard/live', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          
          const syncedLeaderboard = leadData.map((leadUser: LeaderboardUser) => {
            if (leadUser.isCurrentUser || leadUser.userId === currentUserId) {
              return {
                ...leadUser,
                isCurrentUser: true,
                points: updatedProfile.points,
                carbonScore: updatedProfile.carbonScore,
                badge: updatedProfile.points >= 300 ? 'Eco Champion' : updatedProfile.points >= 200 ? 'Green Advocate' : updatedProfile.points >= 100 ? 'Carbon Cutter' : 'Beginner'
              };
            }
            return leadUser;
          });

          syncedLeaderboard.sort((a: any, b: any) => b.points - a.points);
          syncedLeaderboard.forEach((leadUser: any, idx: number) => { leadUser.rank = idx + 1; });
          setLeaderboard(syncedLeaderboard);
        }

        showNotification("Log entry permanently removed from SQL database", "success");
      } else {
        showNotification(`Failed to remove database record: ${resData.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Failed to delete log in database:", err);
      showNotification("Failed to remove database record", "error");
    }
  };

  // Sidebar list configurations
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'calculator', label: 'Calculator', icon: <Calculator size={18} /> },
    { id: 'insights', label: 'AI Insights', icon: <Sparkles size={18} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
  ] as const;

  // Only block render during initial auth initialization.
  // Guard with `mounted` to avoid SSR/client hydration mismatch — auth state
  // is client-only and doesn't exist during server render.
  if (!mounted || authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Leaf size={44} className="text-emerald-500 animate-bounce" />
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-125"></div>
          </div>
          <div className="text-slate-400 font-bold text-sm tracking-wide">Initializing EcoTrack AI...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <SimpleEcoLogin onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="eco-dashboard-layout relative min-h-screen w-full flex flex-col bg-transparent overflow-hidden">
      {/* Main Dashboard Layout */}
      <div 
        className="flex-1 flex flex-col min-h-screen bg-transparent animate-fade-in"
        style={{ display: 'flex' }}
      >
          
          {/* Mobile Top Header Navigation */}
          <header className="lg:hidden flex items-center justify-between bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
            <div className="flex items-center space-x-2">
              <Leaf size={24} className="text-emerald-500" />
              <span className="font-extrabold text-white text-lg tracking-tight">EcoTrack AI</span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-white focus:outline-none p-1 rounded-lg hover:bg-slate-850"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </header>

          <div className="flex-1 flex relative">

            {/* Sidebar container - Desktop visible / Mobile absolute */}
            <aside className={`
              fixed left-0 top-0 bottom-0 z-50 lg:z-30
              w-64 bg-emerald-950 text-emerald-100 border-r border-emerald-900/50
              flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out h-full
              ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              
              <div className="space-y-8">
                {/* Platform Brand */}
                <div className="flex items-center space-x-2.5 px-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-450">
                    <Leaf size={20} />
                  </div>
                  <div>
                    <span className="font-black text-white text-base tracking-tight block">EcoTrack AI</span>
                    <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase mt-0.5">Platform</span>
                  </div>
                </div>

                {/* Sidebar Navigation Items */}
                <nav className="space-y-1">
                  {menuItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150
                          ${isActive 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10' 
                            : 'text-emerald-200/80 hover:bg-emerald-900/50 hover:text-emerald-100'
                          }
                        `}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* User Score Widget Profile on Bottom */}
              <div className="border-t border-emerald-900 pt-6 space-y-4">
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300 font-extrabold border border-emerald-700/50">
                    <Award size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Reactive profile display — reads from AuthContext user state, not raw localStorage */}
                    <div className="text-xs font-bold text-white truncate" title={user?.username || 'Anonymous'}>
                      {user?.username
                        ? user.username.includes('@')
                          ? user.username.split('@')[0]
                          : user.username
                        : 'EcoUser'}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
                      <span>{profile.points} pts</span>
                      <span className="h-1 w-1 bg-emerald-600 rounded-full"></span>
                      <span className="truncate text-[9px]">{profile.points >= 300 ? 'Eco Champion' : profile.points >= 200 ? 'Green Advocate' : profile.points >= 100 ? 'Carbon Cutter' : 'Beginner'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsLoggedIn(false);
                  }}
                  className="w-full text-center py-2 bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-300 hover:text-white transition-all"
                >
                  Sign Out / Switch User
                </button>

                {/* Health Diagnostics Panel */}
                <div className="flex items-center justify-between px-2 pt-2.5 border-t border-emerald-900/50 mt-2 text-[10px] text-emerald-450/80 font-semibold select-none">
                  <div className="flex items-center space-x-1.5">
                    <span className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      healthStatus?.healthy 
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                        : healthStatus?.database === 'online' 
                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse' 
                        : 'bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse'
                    }`}></span>
                    <span>System: {
                      healthStatus?.healthy 
                        ? 'Online' 
                        : healthStatus?.database === 'online' 
                        ? 'Degraded' 
                        : 'Offline'
                    }</span>
                  </div>
                  <div className="text-emerald-500/65 font-medium">
                    DB: {healthStatus?.database === 'online' ? '✓' : '✗'} | AI: {healthStatus?.geminiApi === 'online' ? '✓' : '✗'}
                  </div>
                </div>
              </div>
            </aside>

            {/* Mobile Backdrop for active menu */}
            {mobileMenuOpen && (
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
              ></div>
            )}

            {/* Content wrapper */}
            <div className="flex-1 flex flex-col lg:pl-64 w-full">
              {/* Main Content Area */}
              <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-5xl mx-auto w-full transition-all duration-300 overflow-y-auto">
                {activeTab === 'dashboard' && (
                <ErrorBoundary fallbackTitle="Dashboard Analytics Offline">
                  <DashboardTab 
                    profile={profile} 
                    leaderboard={leaderboard} 
                    onNavigate={setActiveTab}
                    breakdown={breakdown}
                    logs={logs}
                    onDeleteLog={handleDeleteLog}
                    challenges={challenges}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'calculator' && (
                <ErrorBoundary fallbackTitle="Calculator System Offline">
                  <CalculatorTab 
                    profile={profile} 
                    onCalculationSuccess={handleCalculationSuccess}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'insights' && (
                <ErrorBoundary fallbackTitle="AI Recommendation Engine Offline">
                  <InsightsTab 
                    profile={profile} 
                    challenges={challenges} 
                    onToggleChallenge={handleToggleChallenge}
                    onNavigate={setActiveTab}
                    aiAnalysis={aiAnalysis}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'leaderboard' && (
                <ErrorBoundary fallbackTitle="Community Leaderboard Offline">
                  <LeaderboardTab 
                    leaderboard={leaderboard}
                  />
                </ErrorBoundary>
              )}
            </main>
          </div>

          </div>
        </div>
    </div>
  );
}


