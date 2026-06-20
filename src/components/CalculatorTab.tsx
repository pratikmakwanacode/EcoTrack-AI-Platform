import React, { useState } from 'react';
import { Home, Compass, ArrowLeft, ArrowRight, Check, Zap, Flame, Plane, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import { UserProfile } from '@/lib/db';
import { validatePositiveNumber, sanitizeInput } from '@/lib/security';
import { useAuth } from '@/components/AuthContext';
import { useNotification } from '@/components/NotificationContext';
import TiltCard from '@/components/TiltCard';

import { EcoLog } from '@/components/DashboardTab';

interface CalculatorTabProps {
  profile: UserProfile;
  onCalculationSuccess: (data: { success: boolean; log: EcoLog }) => void;
}

export default function CalculatorTab({ profile, onCalculationSuccess }: CalculatorTabProps) {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [electricity, setElectricity] = useState(profile.electricity?.toString() || '');
  const [gas, setGas] = useState(profile.gas?.toString() || '');
  const [carKm, setCarKm] = useState(profile.carKm?.toString() || '');
  const [flights, setFlights] = useState(profile.flights?.toString() || '');
  const [diet, setDiet] = useState<'Vegan' | 'Vegetarian' | 'Non-Vegetarian'>(profile.diet || 'Non-Vegetarian');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateStep = (currentStep: number) => {
    const newErrors: { [key: string]: string } = {};

    if (currentStep === 1) {
      const elecCheck = validatePositiveNumber('Electricity consumption', electricity, 6);
      if (!elecCheck.isValid) {
        newErrors.electricity = elecCheck.error || '';
      }
      
      const gasCheck = validatePositiveNumber('Cooking Gas usage', gas, 6);
      if (!gasCheck.isValid) {
        newErrors.gas = gasCheck.error || '';
      }
    } else if (currentStep === 2) {
      const carCheck = validatePositiveNumber('Distance driven', carKm, 6);
      if (!carCheck.isValid) {
        newErrors.carKm = carCheck.error || '';
      }
      
      const flightCheck = validatePositiveNumber('Flights taken', flights, 6);
      if (!flightCheck.isValid) {
        newErrors.flights = flightCheck.error || '';
      } else if (flights !== '' && !Number.isInteger(Number(flights))) {
        newErrors.flights = 'Flights taken must be a whole number.';
      }
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showNotification(firstError, 'warning');
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/footprint', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          electricity_kwh: Number(electricity) || 0,
          travel_km: Number(carKm) || 0,
          diet_type: diet
        })
      });

      const data = await response.json();
      if (response.status === 201 || (response.ok && data.success)) {
        showNotification("Data Safely Written to SQL Database", "success");
        onCalculationSuccess(data);
      } else {
        showNotification(`Calculation Failure: ${data.error || 'Failed to compute score.'}`, 'error');
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      showNotification('Calculation Failure: Failed to connect to SQL database server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative animate-fade-in">
      {/* Definitions for SVG gradients */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <linearGradient id="grad-energy" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="grad-transport" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="grad-lifestyle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Emissions Calculator
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Provide your average details to calculate your carbon impact dynamically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Stepper + Form (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Progress Stepper */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {step > 1 ? <Check size={14} /> : '1'}
                </div>
                <span className={`text-xs font-bold ${step === 1 ? 'text-emerald-400' : 'text-slate-450'}`}>Housing</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-800 mx-4"></div>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {step > 2 ? <Check size={14} /> : '2'}
                </div>
                <span className={`text-xs font-bold ${step === 2 ? 'text-emerald-400' : 'text-slate-450'}`}>Travel</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-800 mx-4"></div>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  3
                </div>
                <span className={`text-xs font-bold ${step === 3 ? 'text-emerald-400' : 'text-slate-450'}`}>Lifestyle</span>
              </div>
            </div>
          </div>

          {/* Form Content Card */}
          <TiltCard className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="flex-1">
                {/* STEP 1: HOUSING */}
                {step === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
                      <Home size={20} />
                      <h2 className="text-lg font-bold">Step 1: Housing Energy Usage</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center">
                          <Zap size={14} className="mr-1.5 text-emerald-500" />
                          Monthly Electricity Consumption (kWh)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 250"
                          value={electricity}
                          onChange={(e) => setElectricity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 eco-input text-sm"
                        />
                        {errors.electricity && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.electricity}</p>}
                        <p className="text-xs text-slate-450 mt-1">Average utility bill lists this as kWh. Represents lighting, heating/cooling, appliances.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center">
                          <Flame size={14} className="mr-1.5 text-emerald-500" />
                          Cooking Gas usage (kg or cubic meters)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 15"
                          value={gas}
                          onChange={(e) => setGas(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 eco-input text-sm"
                        />
                        {errors.gas && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.gas}</p>}
                        <p className="text-xs text-slate-450 mt-1">Represents cylinders (LPG) or piped gas. Carbon intensity is 2.3 kg CO₂ per unit.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: TRAVEL */}
                {step === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
                      <Navigation size={20} />
                      <h2 className="text-lg font-bold">Step 2: Travel & Transportation</h2>
                    </div>
                  
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center">
                          <Navigation size={14} className="mr-1.5 text-emerald-500" />
                          Monthly Distance Driven (KM) - Car or Motorbike
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 800"
                          value={carKm}
                          onChange={(e) => setCarKm(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 eco-input text-sm"
                        />
                        {errors.carKm && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.carKm}</p>}
                        <p className="text-xs text-slate-450 mt-1">Include average commute distances. Swapping to transit reduces this significantly.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center">
                          <Plane size={14} className="mr-1.5 text-emerald-500" />
                          Flights taken per year
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2"
                          value={flights}
                          onChange={(e) => setFlights(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 eco-input text-sm"
                        />
                        {errors.flights && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.flights}</p>}
                        <p className="text-xs text-slate-450 mt-1">Flights are carbon-heavy. We assume 400 kg CO₂ per flight on average.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: LIFESTYLE */}
                {step === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
                      <Compass size={20} />
                      <h2 className="text-lg font-bold">Step 3: Lifestyle & Diet</h2>
                    </div>
                  
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-slate-200 mb-1">
                        Select your primary diet type:
                      </label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Vegan */}
                        <button
                          type="button"
                          onClick={() => setDiet('Vegan')}
                          className={`p-4 rounded-2xl border text-left transition-all ${diet === 'Vegan' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-sm' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 text-slate-350'}`}
                        >
                          <span className="text-2xl mb-2 block">🌱</span>
                          <div className="font-bold text-sm">Vegan</div>
                          <div className="text-[10px] text-slate-500 mt-1">Zero animal products. Lowest footprint factor.</div>
                        </button>

                        {/* Vegetarian */}
                        <button
                          type="button"
                          onClick={() => setDiet('Vegetarian')}
                          className={`p-4 rounded-2xl border text-left transition-all ${diet === 'Vegetarian' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-sm' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 text-slate-350'}`}
                        >
                          <span className="text-2xl mb-2 block">🧀</span>
                          <div className="font-bold text-sm">Vegetarian</div>
                          <div className="text-[10px] text-slate-500 mt-1">No meat, but consumes dairy and eggs.</div>
                        </button>

                        {/* Non-Vegetarian */}
                        <button
                          type="button"
                          onClick={() => setDiet('Non-Vegetarian')}
                          className={`p-4 rounded-2xl border text-left transition-all ${diet === 'Non-Vegetarian' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-sm' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 text-slate-350'}`}
                        >
                          <span className="text-2xl mb-2 block">🍗</span>
                          <div className="font-bold text-sm">Non-Vegetarian</div>
                          <div className="text-[10px] text-slate-500 mt-1">Regularly consumes poultry, red meat, or fish.</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center space-x-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                ) : (
                  <div></div>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center space-x-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                  >
                    <span>Next Step</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center space-x-1 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <ShieldCheck size={14} />
                    <span>{loading ? 'Calculating...' : 'Compute Footprint'}</span>
                  </button>
                )}
              </div>
            </form>
          </TiltCard>
        </div>

        {/* Right Side: Dynamic Live Breakdown Metrics Grid (col-span-5) */}
        <div className="lg:col-span-5 flex">
          <TiltCard className="p-6 md:p-8 flex flex-col justify-between w-full h-full space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Live Forecast</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Updated in real-time as you type</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-pulse-soft">
                  Active Sync
                </span>
              </div>

              {/* Dynamic Carbon Score Output */}
              <div className="mt-8 mb-6 p-5 rounded-2xl bg-slate-950/45 border border-slate-900/60 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl -mr-10 -mt-10"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Est. Carbon Output</span>
                <div className="mt-2 flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight transition-all duration-300">
                    {((parseFloat(electricity) || 0) * 0.85 * 12 + (parseFloat(gas) || 0) * 2.3 * 12 + (parseFloat(carKm) || 0) * 0.2 * 12 + (parseFloat(flights) || 0) * 400 + (diet === 'Vegan' ? 100 : diet === 'Vegetarian' ? 150 : 250) * 12).toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </span>
                  <span className="text-xs font-bold text-slate-400">kg CO₂/yr</span>
                </div>
              </div>

              {/* Horizontal Bar Matrix */}
              <div className="space-y-5">
                {/* Sector 1: Energy */}
                {(() => {
                  const elecVal = parseFloat(electricity) || 0;
                  const gasVal = parseFloat(gas) || 0;
                  const carVal = parseFloat(carKm) || 0;
                  const flightVal = parseFloat(flights) || 0;
                  let dietScore = 250;
                  if (diet === 'Vegan') dietScore = 100;
                  else if (diet === 'Vegetarian') dietScore = 150;

                  const co2Energy = Math.round((elecVal * 0.85 + gasVal * 2.3) * 12);
                  const co2Transport = Math.round((carVal * 0.2 * 12) + (flightVal * 400));
                  const co2Lifestyle = Math.round(dietScore * 12);
                  const totalCO2 = co2Energy + co2Transport + co2Lifestyle;

                  const pctEnergy = totalCO2 > 0 ? Math.round((co2Energy / totalCO2) * 100) : 0;
                  const pctTransport = totalCO2 > 0 ? Math.round((co2Transport / totalCO2) * 100) : 0;
                  const pctLifestyle = totalCO2 > 0 ? Math.round((co2Lifestyle / totalCO2) * 100) : 0;

                  return (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                            <div className="p-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/10">
                              <Zap size={14} />
                            </div>
                            <span>Housing Energy</span>
                          </div>
                          <span className="font-bold text-slate-350">{pctEnergy}%</span>
                        </div>
                        
                        {/* Custom SVG Progress Bar with Gradients */}
                        <div className="relative w-full h-2.5 rounded-full bg-slate-950/60 overflow-hidden">
                          <svg className="absolute inset-0 w-full h-full">
                            <rect
                              x="0"
                              y="0"
                              height="100%"
                              width={`${pctEnergy}%`}
                              fill="url(#grad-energy)"
                              className="transition-all duration-500 ease-out"
                              rx="5"
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{co2Energy.toLocaleString()} kg/yr</span>
                          <span>Electric &amp; Gas</span>
                        </div>
                      </div>

                      {/* Sector 2: Travel */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                            <div className="p-1 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/10">
                              <Navigation size={14} />
                            </div>
                            <span>Transportation</span>
                          </div>
                          <span className="font-bold text-slate-350">{pctTransport}%</span>
                        </div>
                        
                        {/* Custom SVG Progress Bar with Gradients */}
                        <div className="relative w-full h-2.5 rounded-full bg-slate-950/60 overflow-hidden">
                          <svg className="absolute inset-0 w-full h-full">
                            <rect
                              x="0"
                              y="0"
                              height="100%"
                              width={`${pctTransport}%`}
                              fill="url(#grad-transport)"
                              className="transition-all duration-500 ease-out"
                              rx="5"
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{co2Transport.toLocaleString()} kg/yr</span>
                          <span>Commutes &amp; Flights</span>
                        </div>
                      </div>

                      {/* Sector 3: Lifestyle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                            <div className="p-1 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-500/10">
                              <Compass size={14} />
                            </div>
                            <span>Diet &amp; Lifestyle</span>
                          </div>
                          <span className="font-bold text-slate-350">{pctLifestyle}%</span>
                        </div>
                        
                        {/* Custom SVG Progress Bar with Gradients */}
                        <div className="relative w-full h-2.5 rounded-full bg-slate-950/60 overflow-hidden">
                          <svg className="absolute inset-0 w-full h-full">
                            <rect
                              x="0"
                              y="0"
                              height="100%"
                              width={`${pctLifestyle}%`}
                              fill="url(#grad-lifestyle)"
                              className="transition-all duration-500 ease-out"
                              rx="5"
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{co2Lifestyle.toLocaleString()} kg/yr</span>
                          <span>Diet Selection</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Quick Context Footer info */}
            <div className="pt-4 border-t border-slate-900/60 text-[10px] text-slate-500 leading-normal flex items-start space-x-2">
              <span className="text-emerald-500">💡</span>
              <span>
                Tip: Vegan diet reduces lifestyle footprint by 60% compared to typical non-vegetarian protein diets.
              </span>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
