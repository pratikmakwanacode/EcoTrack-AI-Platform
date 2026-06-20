import React from 'react';
import { Trophy, Award, Flame, User, ArrowUp, Star, Footprints } from 'lucide-react';
import { LeaderboardUser } from '@/lib/db';

interface LeaderboardTabProps {
  leaderboard: LeaderboardUser[];
}

export default function LeaderboardTab({ leaderboard }: LeaderboardTabProps) {
  // Sort leaderboard items by points
  const sortedUsers = [...leaderboard].sort((a, b) => b.points - a.points);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
          <Trophy size={28} className="text-amber-500 mr-2.5" />
          Community Leaderboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Compete with other eco-warriors globally. Earn points by logging challenges and reducing emissions.
        </p>
      </div>

      {/* Leaderboard Card List */}
      <div className="glass-3d-card rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="space-y-4">
          
          {/* List Headers */}
          <div className="grid grid-cols-12 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-6">Member</div>
            <div className="col-span-2 text-right">Points</div>
            <div className="col-span-2 text-right">Footprint</div>
          </div>

          {/* List Items */}
          <div className="space-y-2.5">
            {sortedUsers.map((user, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              // Rank bubble style
              let rankStyle = 'bg-slate-100 text-slate-500';
              if (isFirst) rankStyle = 'bg-amber-100 text-amber-600 font-bold';
              else if (isSecond) rankStyle = 'bg-slate-200 text-slate-700 font-bold';
              else if (isThird) rankStyle = 'bg-orange-100 text-orange-600 font-bold';

              // User card border
              let itemBorder = user.isCurrentUser ? 'border-emerald-500/40 bg-emerald-950/30 shadow-sm' : 'border-slate-850 bg-slate-900/10 hover:bg-slate-900/20';

              return (
                <div 
                  key={user.name}
                  className={`grid grid-cols-12 items-center p-3.5 rounded-2xl border transition-all ${itemBorder}`}
                >
                  {/* Rank */}
                  <div className="col-span-2 flex justify-center">
                    {isFirst || isSecond || isThird ? (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${rankStyle}`}>
                        <Trophy size={14} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-slate-450 font-semibold">
                        #{rank}
                      </div>
                    )}
                  </div>

                  {/* Name and Badge */}
                  <div className="col-span-6 flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${user.isCurrentUser ? 'bg-emerald-600' : 'bg-slate-400'}`}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className={`text-sm font-bold flex items-center ${user.isCurrentUser ? 'text-emerald-300' : 'text-slate-200'}`}>
                        <span>{user.name}</span>
                        {user.isCurrentUser && (
                          <span className="ml-2 bg-emerald-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 flex items-center mt-0.5">
                        <Award size={10} className="mr-0.5 text-slate-500" />
                        <span>{user.badge}</span>
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-right">
                    <div className="text-sm font-black text-slate-200">{user.points}</div>
                    <div className="text-[9px] font-medium text-slate-500">pts</div>
                  </div>

                  {/* Footprint */}
                  <div className="col-span-2 text-right">
                    {user.carbonScore === 0 && user.isCurrentUser ? (
                      <span className="text-[10px] font-bold text-slate-500 italic">Not Calc</span>
                    ) : (
                      <>
                        <div className="text-sm font-bold text-slate-200 flex items-center justify-end">
                          <Footprints size={12} className="mr-0.5 text-emerald-400" />
                          <span>{(user.carbonScore / 1000).toFixed(1)}t</span>
                        </div>
                        <div className="text-[9px] font-medium text-slate-500">CO₂/yr</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
