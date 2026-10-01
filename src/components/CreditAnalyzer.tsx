import React, { useState, useMemo } from 'react';
import { CreditProfileParams, SavedRecord } from '../types/financial';
import { requestCreditScoreAdvice } from '../services/aiService';
import {
  Gauge,
  Sparkles,
  BookmarkCheck,
  Bot,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Percent,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface CreditAnalyzerProps {
  currentScore: number;
  onScoreChange: (score: number) => void;
  onSaveRecord: (record: SavedRecord) => void;
  onSendToBot: (prompt: string, contextData: any) => void;
}

export const CreditAnalyzer: React.FC<CreditAnalyzerProps> = ({
  currentScore,
  onScoreChange,
  onSaveRecord,
  onSendToBot,
}) => {
  const [paymentHistory, setPaymentHistory] = useState<
    'Never Missed' | '1-2 Missed Late' | 'Frequent 60+ Days Late'
  >('Never Missed');
  const [utilization, setUtilization] = useState<number>(24);
  const [creditAge, setCreditAge] = useState<
    '< 2 Years' | '2 - 5 Years' | '5 - 10 Years' | '10+ Years'
  >('5 - 10 Years');
  const [creditMix, setCreditMix] = useState<
    'Only Credit Card' | 'Only Personal Loan' | 'Balanced (Secured + Unsecured)'
  >('Balanced (Secured + Unsecured)');
  const [inquiries, setInquiries] = useState<number>(1);

  const [isDoctorLoading, setIsDoctorLoading] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Compute simulated score adjustment based on standard FICO / CIBIL scoring model
  const simulatedScore = useMemo(() => {
    let score = currentScore;

    // Payment history factor
    if (paymentHistory === '1-2 Missed Late') score -= 35;
    if (paymentHistory === 'Frequent 60+ Days Late') score -= 95;

    // Utilization factor (Benchmark: 30%)
    if (utilization <= 10) score += 20;
    else if (utilization <= 30) score += 10;
    else if (utilization <= 50) score -= 25;
    else if (utilization <= 75) score -= 55;
    else score -= 90;

    // Credit Age
    if (creditAge === '10+ Years') score += 15;
    else if (creditAge === '< 2 Years') score -= 15;

    // Credit Mix
    if (creditMix === 'Balanced (Secured + Unsecured)') score += 10;
    else score -= 10;

    // Inquiries
    if (inquiries === 0) score += 5;
    else if (inquiries >= 3 && inquiries <= 5) score -= 20;
    else if (inquiries > 5) score -= 45;

    return Math.max(300, Math.min(900, Math.round(score)));
  }, [currentScore, paymentHistory, utilization, creditAge, creditMix, inquiries]);

  // Determine Score Band
  const scoreBand = useMemo(() => {
    if (simulatedScore >= 800)
      return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (simulatedScore >= 740)
      return { label: 'Very Good', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' };
    if (simulatedScore >= 670)
      return { label: 'Good', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    if (simulatedScore >= 580)
      return { label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { label: 'Poor', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  }, [simulatedScore]);

  // Calculate needle rotation for semi-circle gauge (300 to 900 maps to -90deg to +90deg)
  const needleAngle = useMemo(() => {
    const pct = (simulatedScore - 300) / (900 - 300);
    return -90 + pct * 180;
  }, [simulatedScore]);

  const handleRunAiDoctor = async () => {
    setIsDoctorLoading(true);
    const profile: CreditProfileParams = {
      score: simulatedScore,
      paymentHistory,
      utilization,
      creditAge,
      creditMix,
      inquiries,
    };
    const res = await requestCreditScoreAdvice(profile);
    setAiAdvice(res);
    setIsDoctorLoading(false);
  };

  const handleSave = () => {
    const record: SavedRecord = {
      id: 'CRED-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      type: 'Credit Analysis',
      title: `Credit Health Audit (${simulatedScore} - ${scoreBand.label})`,
      details: {
        score: simulatedScore,
        band: scoreBand.label,
        utilization: `${utilization}%`,
        paymentHistory,
        creditAge,
        inquiries,
      },
      summary: `Score: ${simulatedScore} (${scoreBand.label}) | Utilization: ${utilization}% | Payment History: ${paymentHistory}`,
    };

    onSaveRecord(record);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleConsultAyush = () => {
    const prompt = `My credit score currently stands at ${simulatedScore} (${scoreBand.label}). My credit utilization is at ${utilization}%, payment history is "${paymentHistory}", and I have ${inquiries} recent hard inquiries. What is the fastest strategy to boost my score above 780 for premier bank interest rates?`;
    onSendToBot(prompt, {
      creditScore: simulatedScore,
      utilization,
      paymentHistory,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-emerald-950/40 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-2">
              <Gauge className="w-3.5 h-3.5" />
              CIBIL / FICO Score Optimization Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Credit Score Analyzer & AI Doctor
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Inspect the 5 core underwriting pillars governing your credit score. Simulate debt reduction impacts and generate a step-by-step credit recovery roadmap.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all shadow-sm"
            >
              <BookmarkCheck className="w-4 h-4 text-cyan-400" />
              {savedSuccess ? 'Saved to Records!' : 'Save Audit'}
            </button>
            <button
              onClick={handleConsultAyush}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Bot className="w-4 h-4 text-cyan-100" />
              Ask Ayush
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gauge and Key Metrics */}
        <div className="lg:col-span-5 space-y-5">
          {/* Credit Dial Card */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 backdrop-blur-xl text-center relative overflow-hidden">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Credit Bureau Health Rating
            </h2>

            {/* Semi-Circle SVG Gauge */}
            <div className="relative w-64 h-36 mx-auto my-3 flex items-end justify-center">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Gradient Arc Segments */}
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="35%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {/* Center Pivot */}
                <circle cx="100" cy="100" r="7" fill="#0f172a" stroke="#fff" strokeWidth="2.5" />
                {/* Needle */}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '100px 100px',
                    transform: `rotate(${needleAngle}deg)`,
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </svg>
            </div>

            {/* Score Display */}
            <div className="mt-1">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                {simulatedScore}
              </span>
              <span className="text-xs text-slate-500 ml-1 font-mono">/ 900</span>
            </div>

            <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border border-white/10" style={{ backgroundColor: scoreBand.bg }}>
              <span className={`w-2 h-2 rounded-full ${scoreBand.color.replace('text-', 'bg-')}`}></span>
              <span className={scoreBand.color}>{scoreBand.label} Credit Tier</span>
            </div>

            {/* Quick Score Range Sliders */}
            <div className="mt-6 pt-5 border-t border-white/10 text-left">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">Base Reported Score</span>
                <span className="font-mono text-cyan-400 font-bold">{currentScore}</span>
              </div>
              <input
                type="range"
                min={300}
                max={900}
                step={5}
                value={currentScore}
                onChange={(e) => onScoreChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>300 (Poor)</span>
                <span>650 (Fair)</span>
                <span>750 (Good)</span>
                <span>900 (Perfect)</span>
              </div>
            </div>

            {/* Impact Delta */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Simulation Adjustment</span>
              <span
                className={`font-mono font-bold ${
                  simulatedScore >= currentScore ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {simulatedScore >= currentScore ? `+${simulatedScore - currentScore}` : simulatedScore - currentScore} pts
              </span>
            </div>
          </div>

          {/* AI Doctor Trigger Card */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-xl">
            <h3 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Ayush AI Credit Doctor
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Get an instant 30-60-90 day tactical plan to remove negative marks, adjust statement balances, and raise your score.
            </p>
            <button
              onClick={handleRunAiDoctor}
              disabled={isDoctorLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-90 text-white shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isDoctorLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Formulating Recovery Prescription...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  Prescribe 90-Day Credit Boost Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: 5 Impact Pillars Simulation */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                The 5 Credit Score Drivers (Weights)
              </h2>
              <span className="text-xs text-slate-400">Interactive Simulation</span>
            </div>

            {/* 1. Payment History (35%) */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  1. Payment History (35% Weight)
                </span>
                <span className="text-[11px] font-mono text-emerald-400">Highest Impact</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    'Never Missed',
                    '1-2 Missed Late',
                    'Frequent 60+ Days Late',
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPaymentHistory(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                      paymentHistory === opt
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Credit Card Utilization (30%) */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-cyan-400" />
                  2. Credit Card Utilization Ratio (30% Weight)
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    utilization <= 30 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {utilization}% Used
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={utilization}
                onChange={(e) => setUtilization(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400">0-10% (Prime)</span>
                <span className="text-teal-400">11-30% (Recommended)</span>
                <span className="text-rose-400">&gt;30% (Penalty zone)</span>
              </div>
            </div>

            {/* 3. Credit Age / Length (15%) */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  3. Credit History Age (15% Weight)
                </span>
                <span className="text-[11px] text-slate-400">Maturity Factor</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['< 2 Years', '2 - 5 Years', '5 - 10 Years', '10+ Years'] as const).map(
                  (age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setCreditAge(age)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all border ${
                        creditAge === age
                          ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                          : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      {age}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 4. Credit Mix & 5. Recent Inquiries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Credit Mix */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  4. Credit Mix (10%)
                </span>
                <select
                  value={creditMix}
                  onChange={(e) => setCreditMix(e.target.value as any)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Balanced (Secured + Unsecured)">Balanced (Secured + Unsecured)</option>
                  <option value="Only Credit Card">Only Credit Cards (Unsecured)</option>
                  <option value="Only Personal Loan">Only Personal Loans</option>
                </select>
              </div>

              {/* Hard Inquiries */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    5. Hard Inquiries (10%)
                  </span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{inquiries}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={inquiries}
                  onChange={(e) => setInquiries(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  {inquiries <= 1 ? 'Optimal (Low risk)' : inquiries <= 3 ? 'Mild inquiry activity' : 'Credit hungry flag'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Doctor Prescription Output */}
          {aiAdvice && (
            <div className="rounded-3xl bg-slate-900/80 border border-cyan-500/30 p-5 sm:p-6 backdrop-blur-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">
                    Ayush AI Prescription ({aiAdvice.projectedBoost})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  Target: 780+
                </span>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300">
                <strong className="text-cyan-300 block mb-1">Primary Vulnerability:</strong>
                {aiAdvice.keyIssue}
              </div>

              {/* 30-60-90 Day Steps */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Days 1 - 30 (Immediate Sprint)
                  </span>
                  <p className="text-xs text-slate-300">{aiAdvice.thirtyDayAction}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Days 31 - 60 (Correction Sprint)
                  </span>
                  <p className="text-xs text-slate-300">{aiAdvice.sixtyDayAction}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Days 61 - 90 (Fortification Sprint)
                  </span>
                  <p className="text-xs text-slate-300">{aiAdvice.ninetyDayAction}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleConsultAyush}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Consult Ayush on Disputing Inaccurate Marks <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
