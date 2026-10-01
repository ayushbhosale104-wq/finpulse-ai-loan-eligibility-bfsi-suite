import React, { useState, useMemo } from 'react';
import {
  CurrencySymbol,
  EmploymentType,
  LoanCategory,
  LoanInputParams,
  SavedRecord,
} from '../types/financial';
import {
  calculateEMI,
  calculateFOIR,
  calculateMaxLoanEligibility,
  formatCurrency,
} from '../utils/calculations';
import { requestLoanUnderwritingAudit } from '../services/aiService';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  BookmarkCheck,
  Bot,
  HelpCircle,
  ArrowRight,
  Loader2,
  Scale,
  ArrowLeftRight,
  TrendingDown,
  Layers,
  Calendar,
} from 'lucide-react';

interface LoanCheckerProps {
  currency: CurrencySymbol;
  creditScore: number;
  onSaveRecord: (record: SavedRecord) => void;
  onSendToBot: (prompt: string, contextData: any) => void;
}

export const LoanChecker: React.FC<LoanCheckerProps> = ({
  currency,
  creditScore,
  onSaveRecord,
  onSendToBot,
}) => {
  // Sub-feature toggle: 'eligibility' | 'compare'
  const [activeSubTab, setActiveSubTab] = useState<'eligibility' | 'compare'>('eligibility');

  // Input parameters (Eligibility Assessment)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(6500);
  const [coApplicantIncome, setCoApplicantIncome] = useState<number>(0);
  const [existingEmis, setExistingEmis] = useState<number>(600);
  const [requestedAmount, setRequestedAmount] = useState<number>(120000);
  const [category, setCategory] = useState<LoanCategory>('Home Loan');
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>('Salaried (Permanent)');

  // Compare Loans State (Scenario A vs Scenario B)
  const [scenarioA, setScenarioA] = useState({
    name: 'Scenario A (Baseline)',
    amount: 120000,
    rate: 8.5,
    tenureYears: 20,
    feePercent: 0.5,
  });

  const [scenarioB, setScenarioB] = useState({
    name: 'Scenario B (Accelerated / Low Rate)',
    amount: 120000,
    rate: 7.9,
    tenureYears: 15,
    feePercent: 0.5,
  });

  // AI Underwriting State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [aiAuditResult, setAiAuditResult] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Category presets for quick rates & tenures
  const categoryPresets: Record<
    LoanCategory,
    { rate: number; defaultTenure: number }
  > = {
    'Home Loan': { rate: 8.5, defaultTenure: 20 },
    'Personal Loan': { rate: 11.5, defaultTenure: 4 },
    'Auto / Vehicle Loan': { rate: 9.0, defaultTenure: 5 },
    'Education Loan': { rate: 9.5, defaultTenure: 7 },
    'Business Loan': { rate: 12.0, defaultTenure: 5 },
    'Loan Against Property': { rate: 9.2, defaultTenure: 12 },
  };

  const handleCategoryChange = (newCat: LoanCategory) => {
    setCategory(newCat);
    setInterestRate(categoryPresets[newCat].rate);
    setTenureYears(categoryPresets[newCat].defaultTenure);
  };

  // Computations for Eligibility Assessment
  const totalIncome = monthlyIncome + coApplicantIncome;
  const tenureMonths = tenureYears * 12;
  const computedEmi = useMemo(
    () => calculateEMI(requestedAmount, interestRate, tenureMonths),
    [requestedAmount, interestRate, tenureMonths]
  );

  const foir = useMemo(
    () => calculateFOIR(existingEmis, computedEmi, totalIncome),
    [existingEmis, computedEmi, totalIncome]
  );

  // Maximum allowable FOIR
  const allowableFoir = totalIncome > 10000 ? 55 : totalIncome > 4000 ? 50 : 40;

  const { maxAllowedEmi, maxLoanAmount } = useMemo(
    () =>
      calculateMaxLoanEligibility(
        totalIncome,
        existingEmis,
        interestRate,
        tenureMonths,
        allowableFoir
      ),
    [totalIncome, existingEmis, interestRate, tenureMonths, allowableFoir]
  );

  // Determine eligibility status & probability
  const isApproved = foir <= allowableFoir && requestedAmount <= maxLoanAmount;
  const isConditional =
    !isApproved && (foir <= allowableFoir + 10 || requestedAmount <= maxLoanAmount * 1.25);

  const status: 'Approved' | 'Conditional' | 'High Risk' = isApproved
    ? 'Approved'
    : isConditional
    ? 'Conditional'
    : 'High Risk';

  const approvalScore = useMemo(() => {
    let score = 95;
    if (foir > allowableFoir) score -= (foir - allowableFoir) * 2;
    if (creditScore < 750) score -= (750 - creditScore) * 0.15;
    if (existingEmis > totalIncome * 0.3) score -= 10;
    if (employmentType === 'Gig / Contract Freelancer') score -= 8;
    return Math.max(15, Math.min(98, Math.round(score)));
  }, [foir, allowableFoir, creditScore, existingEmis, totalIncome, employmentType]);

  // Run AI Underwriting Audit via Gemini API
  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    const params: LoanInputParams & {
      foir: number;
      maxEligibleLoan: number;
      currency: CurrencySymbol;
    } = {
      monthlyIncome,
      coApplicantIncome,
      existingEmis,
      requestedAmount,
      category,
      tenureYears,
      interestRate,
      creditScore,
      employmentType,
      foir,
      maxEligibleLoan: maxLoanAmount,
      currency,
    };

    const audit = await requestLoanUnderwritingAudit(params);
    setAiAuditResult(audit);
    setIsAuditing(false);
  };

  // Save current record to session/storage
  const handleSaveSimulation = () => {
    const record: SavedRecord = {
      id: 'ELIG-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      type: 'Loan Eligibility',
      title: `${category} Check (${formatCurrency(requestedAmount, currency)})`,
      details: {
        monthlyIncome,
        existingEmis,
        requestedAmount,
        category,
        tenureYears,
        interestRate,
        foir: `${foir}%`,
        maxEligibleLoan: formatCurrency(maxLoanAmount, currency),
        status,
        approvalScore: `${approvalScore}%`,
      },
      summary: `Requested ${formatCurrency(requestedAmount, currency)} | Eligible: ${formatCurrency(maxLoanAmount, currency)} | FOIR: ${foir}% | Status: ${status}`,
    };

    onSaveRecord(record);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // ==========================================
  // COMPARE LOANS CALCULATIONS
  // ==========================================
  const comparisonCalculations = useMemo(() => {
    const monthsA = scenarioA.tenureYears * 12;
    const emiA = calculateEMI(scenarioA.amount, scenarioA.rate, monthsA);
    const totalRepaidA = emiA * monthsA;
    const totalInterestA = Math.max(0, totalRepaidA - scenarioA.amount);
    const processingFeeA = scenarioA.amount * (scenarioA.feePercent / 100);
    const totalCostA = totalRepaidA + processingFeeA;
    const foirA = calculateFOIR(existingEmis, emiA, totalIncome);

    const monthsB = scenarioB.tenureYears * 12;
    const emiB = calculateEMI(scenarioB.amount, scenarioB.rate, monthsB);
    const totalRepaidB = emiB * monthsB;
    const totalInterestB = Math.max(0, totalRepaidB - scenarioB.amount);
    const processingFeeB = scenarioB.amount * (scenarioB.feePercent / 100);
    const totalCostB = totalRepaidB + processingFeeB;
    const foirB = calculateFOIR(existingEmis, emiB, totalIncome);

    const interestDifference = totalInterestA - totalInterestB;
    const emiDifference = emiA - emiB;
    const totalCostDifference = totalCostA - totalCostB;

    return {
      scenarioA: {
        emi: emiA,
        totalInterest: totalInterestA,
        totalCost: totalCostA,
        processingFee: processingFeeA,
        months: monthsA,
        foir: foirA,
        interestRatio: totalRepaidA > 0 ? (totalInterestA / totalRepaidA) * 100 : 0,
      },
      scenarioB: {
        emi: emiB,
        totalInterest: totalInterestB,
        totalCost: totalCostB,
        processingFee: processingFeeB,
        months: monthsB,
        foir: foirB,
        interestRatio: totalRepaidB > 0 ? (totalInterestB / totalRepaidB) * 100 : 0,
      },
      interestDifference,
      emiDifference,
      totalCostDifference,
      savingsWinner: interestDifference > 0 ? 'B' : interestDifference < 0 ? 'A' : 'TIE',
      savingsAmount: Math.abs(interestDifference),
    };
  }, [scenarioA, scenarioB, existingEmis, totalIncome]);

  // Save Comparison Record
  const handleSaveComparison = () => {
    const { scenarioA: sA, scenarioB: sB, savingsWinner, savingsAmount } = comparisonCalculations;
    const record: SavedRecord = {
      id: 'CMP-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      type: 'Loan Eligibility',
      title: `Loan Comparison: ${formatCurrency(scenarioA.amount, currency)} (${scenarioA.rate}% ${scenarioA.tenureYears}y vs ${scenarioB.rate}% ${scenarioB.tenureYears}y)`,
      details: {
        scenarioA: `${formatCurrency(scenarioA.amount, currency)} @ ${scenarioA.rate}% for ${scenarioA.tenureYears}y | EMI: ${formatCurrency(sA.emi, currency)} | Interest: ${formatCurrency(sA.totalInterest, currency)}`,
        scenarioB: `${formatCurrency(scenarioB.amount, currency)} @ ${scenarioB.rate}% for ${scenarioB.tenureYears}y | EMI: ${formatCurrency(sB.emi, currency)} | Interest: ${formatCurrency(sB.totalInterest, currency)}`,
        savingsWinner: `Scenario ${savingsWinner}`,
        savingsAmount: formatCurrency(savingsAmount, currency),
      },
      summary: `Scenario ${savingsWinner} saves ${formatCurrency(savingsAmount, currency)} in lifetime interest! (EMI: ${formatCurrency(sA.emi, currency)} vs ${formatCurrency(sB.emi, currency)})`,
    };

    onSaveRecord(record);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Consult Ayush on comparison
  const handleConsultAyushComparison = () => {
    const { scenarioA: sA, scenarioB: sB, interestDifference, emiDifference } = comparisonCalculations;
    const prompt = `Ayush, I am comparing two loan options side-by-side:
- Option A: ${currency}${scenarioA.amount.toLocaleString()} at ${scenarioA.rate}% for ${scenarioA.tenureYears} years (EMI: ${currency}${sA.emi.toLocaleString()}/mo, Total Interest: ${currency}${sA.totalInterest.toLocaleString()})
- Option B: ${currency}${scenarioB.amount.toLocaleString()} at ${scenarioB.rate}% for ${scenarioB.tenureYears} years (EMI: ${currency}${sB.emi.toLocaleString()}/mo, Total Interest: ${currency}${sB.totalInterest.toLocaleString()})
The interest cost difference is ${currency}${Math.abs(interestDifference).toLocaleString()}, and the monthly EMI difference is ${currency}${Math.abs(emiDifference).toLocaleString()}/mo.
Which scenario makes more financial sense considering cash-flow flexibility versus total interest compounding?`;

    onSendToBot(prompt, {
      currency,
      monthlyIncome,
      existingEmis,
      requestedLoan: scenarioA.amount,
      foir: sA.foir,
    });
  };

  // Sync current Eligibility numbers to Scenario A
  const handleSyncCurrentToScenarioA = () => {
    setScenarioA({
      name: `${category} (Current)`,
      amount: requestedAmount,
      rate: interestRate,
      tenureYears: tenureYears,
      feePercent: 0.5,
    });
    setScenarioB({
      name: `${category} (5-Year Faster Payoff)`,
      amount: requestedAmount,
      rate: Math.max(3, interestRate - 0.3),
      tenureYears: Math.max(1, tenureYears - 5),
      feePercent: 0.5,
    });
    setActiveSubTab('compare');
  };

  // Preset comparative shortcuts
  const applyComparePreset = (type: 'tenure' | 'rate' | 'high_principal') => {
    if (type === 'tenure') {
      setScenarioA((prev) => ({ ...prev, tenureYears: 20, rate: 8.5 }));
      setScenarioB((prev) => ({ ...prev, tenureYears: 15, rate: 8.2 }));
    } else if (type === 'rate') {
      setScenarioA((prev) => ({ ...prev, rate: 9.0 }));
      setScenarioB((prev) => ({ ...prev, rate: 8.25 }));
    } else if (type === 'high_principal') {
      setScenarioA((prev) => ({ ...prev, amount: 100000 }));
      setScenarioB((prev) => ({ ...prev, amount: 140000 }));
    }
  };

  // Send to Ayush bot for standard eligibility
  const handleConsultAyush = () => {
    const prompt = `I am applying for a ${category} of ${currency}${requestedAmount.toLocaleString()} with a monthly income of ${currency}${monthlyIncome.toLocaleString()}. My current computed FOIR is ${foir}% and my max eligibility is ${currency}${maxLoanAmount.toLocaleString()}. Can you give me an in-depth underwriting review and show me how to optimize my profile for instant bank approval?`;
    onSendToBot(prompt, {
      currency,
      monthlyIncome,
      existingEmis,
      requestedLoan: requestedAmount,
      loanCategory: category,
      foir,
      creditScore,
      maxEligibleLoan: maxLoanAmount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 border border-emerald-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Underwriting Intelligence v3.8
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Loan Eligibility & Comparison
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Calculate your institutional FOIR approval odds or compare two loan scenarios side-by-side to expose interest rate and tenure cost differences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={activeSubTab === 'eligibility' ? handleSaveSimulation : handleSaveComparison}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all shadow-sm"
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              {savedSuccess ? 'Saved to Records!' : 'Save Record'}
            </button>
            <button
              onClick={activeSubTab === 'eligibility' ? handleConsultAyush : handleConsultAyushComparison}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Bot className="w-4 h-4 text-cyan-200" />
              Ask Ayush
            </button>
          </div>
        </div>

        {/* SUB-FEATURE TAB SWITCHER */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveSubTab('eligibility')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'eligibility'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Eligibility Assessment
            </button>
            <button
              onClick={() => setActiveSubTab('compare')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'compare'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
              Compare Loans (Side-by-Side)
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                New
              </span>
            </button>
          </div>

          {activeSubTab === 'eligibility' && (
            <button
              onClick={handleSyncCurrentToScenarioA}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Compare this loan with an alternative offer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: ELIGIBILITY ASSESSMENT
          ========================================================================= */}
      {activeSubTab === 'eligibility' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Loan Inputs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Borrower Financial Parameters
                </h2>
                <span className="text-xs text-slate-400">Step 1 of 2</span>
              </div>

              {/* Loan Purpose / Category Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Loan Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'Home Loan',
                      'Personal Loan',
                      'Auto / Vehicle Loan',
                      'Education Loan',
                      'Business Loan',
                      'Loan Against Property',
                    ] as LoanCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                        category === cat
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800/80 hover:border-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Income & Existing EMIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Monthly Net Take-Home Income ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={monthlyIncome || ''}
                      onChange={(e) => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-800/70 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="e.g. 6500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Existing Monthly EMIs & Dues ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={existingEmis || ''}
                      onChange={(e) => setExistingEmis(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-800/70 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
              </div>

              {/* Co-applicant Booster (Optional) */}
              <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    Add Co-Applicant Income (Booster)
                  </span>
                  <span className="text-[11px] text-teal-400/80">Raises Eligibility Limit</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={coApplicantIncome || ''}
                    onChange={(e) => setCoApplicantIncome(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800/70 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. 2500 (Optional spouse/parent income)"
                  />
                </div>
              </div>

              {/* Requested Loan Amount with Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Requested Loan Amount
                  </label>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {formatCurrency(requestedAmount, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={1000000}
                  step={5000}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>{formatCurrency(5000, currency)}</span>
                  <span>{formatCurrency(500000, currency)}</span>
                  <span>{formatCurrency(1000000, currency)}+</span>
                </div>
              </div>

              {/* Tenure & Interest Rate Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Tenure: {tenureYears} Years ({tenureMonths} Months)
                    </label>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Expected Interest Rate (% per annum)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      max="30"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Employment Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Employment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Salaried (Permanent)',
                      'Self-Employed Professional',
                      'Business Owner',
                      'Gig / Contract Freelancer',
                    ] as EmploymentType[]
                  ).map((emp) => (
                    <button
                      key={emp}
                      type="button"
                      onClick={() => setEmploymentType(emp)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                        employmentType === emp
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      {emp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Underwriting Verdict & FOIR Breakdown */}
          <div className="lg:col-span-5 space-y-5">
            {/* Main Decision Card */}
            <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Underwriting Verdict
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : status === 'Conditional'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {status === 'Approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : status === 'Conditional' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {status === 'Approved'
                    ? 'Eligible (High Approval)'
                    : status === 'Conditional'
                    ? 'Conditional Approval'
                    : 'High Underwriting Risk'}
                </span>
              </div>

              {/* Approval Probability Dial */}
              <div className="flex items-center gap-4 bg-slate-800/40 rounded-2xl p-4 border border-white/5 mb-5">
                <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <span className="text-xl font-black font-mono text-emerald-400">
                    {approvalScore}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Institutional Approval Probability</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {approvalScore >= 80
                      ? 'Prime Bank Grade'
                      : approvalScore >= 60
                      ? 'Standard Risk Tier'
                      : 'Sub-Prime / High Spread'}
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        approvalScore >= 80
                          ? 'bg-emerald-400'
                          : approvalScore >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${approvalScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Computed Monthly EMI</span>
                  <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                    {formatCurrency(computedEmi, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">at {interestRate}% for {tenureYears}y</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Max Borrowing Capacity</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                    {formatCurrency(maxLoanAmount, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Max EMI: {formatCurrency(maxAllowedEmi, currency)}</span>
                </div>
              </div>

              {/* FOIR Meter */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-800/30 border border-white/5 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300 flex items-center gap-1.5">
                    FOIR / DTI Ratio
                    <span title="Fixed Obligation to Income Ratio" className="cursor-help inline-flex">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    </span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      foir <= 40 ? 'text-emerald-400' : foir <= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {foir}%
                  </span>
                </div>

                {/* Multi-segment meter */}
                <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="w-[40%] bg-emerald-500/80 h-full" title="Safe Zone (0-40%)"></div>
                  <div className="w-[15%] bg-amber-500/80 h-full" title="Moderate (40-55%)"></div>
                  <div className="w-[45%] bg-rose-500/80 h-full" title="High Risk (55%+)"></div>
                  {/* Needle Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-md transition-all duration-300"
                    style={{ left: `${Math.min(98, Math.max(2, foir))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0%</span>
                  <span className="text-emerald-400">Safe: &lt;40%</span>
                  <span className="text-amber-400">Limit: {allowableFoir}%</span>
                  <span className="text-rose-400">Critical</span>
                </div>
              </div>

              {/* Action button: Gemini Underwriting Audit */}
              <button
                onClick={handleRunAiAudit}
                disabled={isAuditing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Running Neural Underwriting Audit...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    Generate Ayush AI Underwriting Audit
                  </>
                )}
              </button>
            </div>

            {/* AI Audit Results Container */}
            {aiAuditResult && (
              <div className="rounded-3xl bg-slate-900/80 border border-emerald-500/30 p-5 sm:p-6 backdrop-blur-xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-xs font-bold text-white">
                      Ayush AI Institutional Audit
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {aiAuditResult.riskLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {aiAuditResult.summary}
                </p>

                {aiAuditResult.strategies && aiAuditResult.strategies.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Strategic Recommendations to Qualify:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiAuditResult.strategies.map((strat: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{strat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleConsultAyush}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    Discuss strategies with Ayush Bot <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: COMPARE LOANS (SIDE-BY-SIDE SCENARIOS)
          ========================================================================= */}
      {activeSubTab === 'compare' && (
        <div className="space-y-6">
          {/* Presets and Quick Comparative Shortcuts */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Quick Comparison Scenarios:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => applyComparePreset('tenure')}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all"
              >
                20-Year vs 15-Year Payoff
              </button>
              <button
                type="button"
                onClick={() => applyComparePreset('rate')}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all"
              >
                9.0% vs 8.25% Rate Cut
              </button>
              <button
                type="button"
                onClick={() => applyComparePreset('high_principal')}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all"
              >
                $100k vs $140k Borrowing
              </button>
            </div>
          </div>

          {/* Winner Callout Banner */}
          <div
            className={`p-5 rounded-3xl border backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              comparisonCalculations.savingsWinner === 'B'
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 border-emerald-500/30'
                : comparisonCalculations.savingsWinner === 'A'
                ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-emerald-950/40 border-cyan-500/30'
                : 'bg-slate-900/60 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                  Interest Cost Verdict
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {comparisonCalculations.savingsWinner === 'TIE' ? (
                    'Both loan scenarios have identical total interest costs.'
                  ) : (
                    <>
                      Scenario {comparisonCalculations.savingsWinner} saves{' '}
                      <span className="font-mono text-emerald-400">
                        {formatCurrency(comparisonCalculations.savingsAmount, currency)}
                      </span>{' '}
                      in lifetime interest costs!
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Monthly EMI trade-off:{' '}
                  {comparisonCalculations.emiDifference > 0 ? (
                    <>
                      Scenario B is{' '}
                      <strong className="text-white font-mono">
                        {formatCurrency(Math.abs(comparisonCalculations.emiDifference), currency)}/mo cheaper
                      </strong>
                    </>
                  ) : comparisonCalculations.emiDifference < 0 ? (
                    <>
                      Scenario B requires{' '}
                      <strong className="text-amber-400 font-mono">
                        {formatCurrency(Math.abs(comparisonCalculations.emiDifference), currency)}/mo higher EMI
                      </strong>{' '}
                      to pay off faster
                    </>
                  ) : (
                    'Both scenarios have matching monthly EMIs'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSaveComparison}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 transition-all shadow-sm"
              >
                <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                {savedSuccess ? 'Saved!' : 'Save Comparison'}
              </button>
              <button
                onClick={handleConsultAyushComparison}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/20 hover:opacity-90 transition-all"
              >
                <Bot className="w-4 h-4 text-cyan-100" />
                Analyze with Ayush
              </button>
            </div>
          </div>

          {/* Two Side-by-Side Scenario Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scenario A Card */}
            <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                  <input
                    type="text"
                    value={scenarioA.name}
                    onChange={(e) => setScenarioA({ ...scenarioA, name: e.target.value })}
                    className="bg-transparent font-bold text-sm text-white focus:outline-none border-b border-transparent hover:border-white/20 focus:border-cyan-400 transition-all"
                  />
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                  Scenario A
                </span>
              </div>

              {/* Inputs A */}
              <div className="space-y-4">
                {/* Principal */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Loan Amount</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {formatCurrency(scenarioA.amount, currency)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={1000000}
                    step={5000}
                    value={scenarioA.amount}
                    onChange={(e) => setScenarioA({ ...scenarioA, amount: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Rate */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Interest Rate (% per annum)</span>
                    <span className="font-mono font-bold text-white">{scenarioA.rate}%</span>
                  </div>
                  <input
                    type="range"
                    min={3.5}
                    max={25}
                    step={0.1}
                    value={scenarioA.rate}
                    onChange={(e) => setScenarioA({ ...scenarioA, rate: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Tenure */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Tenure (Years)</span>
                    <span className="font-mono font-bold text-white">{scenarioA.tenureYears} Years ({scenarioA.tenureYears * 12} Months)</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={scenarioA.tenureYears}
                    onChange={(e) => setScenarioA({ ...scenarioA, tenureYears: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              {/* Outputs Summary Box A */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Monthly EMI</span>
                  <span className="text-2xl font-black font-mono text-white">
                    {formatCurrency(comparisonCalculations.scenarioA.emi, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
                  <span className="text-xs text-slate-400">Total Interest Liability</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    {formatCurrency(comparisonCalculations.scenarioA.totalInterest, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline text-xs text-slate-400 border-t border-white/5 pt-2">
                  <span>Total Repayment (P + I)</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(comparisonCalculations.scenarioA.totalCost, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline text-xs text-slate-400">
                  <span>FOIR / Debt Ratio Impact</span>
                  <span
                    className={`font-mono font-bold ${
                      comparisonCalculations.scenarioA.foir <= 40
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {comparisonCalculations.scenarioA.foir}%
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario B Card */}
            <div className="rounded-3xl bg-slate-900/60 border border-emerald-500/30 p-5 sm:p-6 backdrop-blur-xl space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  <input
                    type="text"
                    value={scenarioB.name}
                    onChange={(e) => setScenarioB({ ...scenarioB, name: e.target.value })}
                    className="bg-transparent font-bold text-sm text-white focus:outline-none border-b border-transparent hover:border-white/20 focus:border-emerald-400 transition-all"
                  />
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  Scenario B
                </span>
              </div>

              {/* Inputs B */}
              <div className="space-y-4">
                {/* Principal */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Loan Amount</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(scenarioB.amount, currency)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={1000000}
                    step={5000}
                    value={scenarioB.amount}
                    onChange={(e) => setScenarioB({ ...scenarioB, amount: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Rate */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Interest Rate (% per annum)</span>
                    <span className="font-mono font-bold text-white">{scenarioB.rate}%</span>
                  </div>
                  <input
                    type="range"
                    min={3.5}
                    max={25}
                    step={0.1}
                    value={scenarioB.rate}
                    onChange={(e) => setScenarioB({ ...scenarioB, rate: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Tenure */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Tenure (Years)</span>
                    <span className="font-mono font-bold text-white">{scenarioB.tenureYears} Years ({scenarioB.tenureYears * 12} Months)</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={scenarioB.tenureYears}
                    onChange={(e) => setScenarioB({ ...scenarioB, tenureYears: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Outputs Summary Box B */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Monthly EMI</span>
                  <span className="text-2xl font-black font-mono text-white">
                    {formatCurrency(comparisonCalculations.scenarioB.emi, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
                  <span className="text-xs text-slate-400">Total Interest Liability</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {formatCurrency(comparisonCalculations.scenarioB.totalInterest, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline text-xs text-slate-400 border-t border-white/5 pt-2">
                  <span>Total Repayment (P + I)</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(comparisonCalculations.scenarioB.totalCost, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline text-xs text-slate-400">
                  <span>FOIR / Debt Ratio Impact</span>
                  <span
                    className={`font-mono font-bold ${
                      comparisonCalculations.scenarioB.foir <= 40
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {comparisonCalculations.scenarioB.foir}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Breakdown: Comparison Matrix */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Side-by-Side Financial Cost Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-white/10 text-slate-400 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Financial Metric</th>
                    <th className="py-2.5 px-3 text-cyan-400">Scenario A</th>
                    <th className="py-2.5 px-3 text-emerald-400">Scenario B</th>
                    <th className="py-2.5 px-3 text-right">Variance / Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">Principal Financed</td>
                    <td className="py-2.5 px-3">{formatCurrency(scenarioA.amount, currency)}</td>
                    <td className="py-2.5 px-3">{formatCurrency(scenarioB.amount, currency)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(Math.abs(scenarioA.amount - scenarioB.amount), currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">Annual Interest Rate</td>
                    <td className="py-2.5 px-3">{scenarioA.rate}%</td>
                    <td className="py-2.5 px-3">{scenarioB.rate}%</td>
                    <td className="py-2.5 px-3 text-right">
                      {Math.abs(scenarioA.rate - scenarioB.rate).toFixed(2)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">Loan Tenure</td>
                    <td className="py-2.5 px-3">{scenarioA.tenureYears} Years</td>
                    <td className="py-2.5 px-3">{scenarioB.tenureYears} Years</td>
                    <td className="py-2.5 px-3 text-right">
                      {Math.abs(scenarioA.tenureYears - scenarioB.tenureYears)} Years
                    </td>
                  </tr>
                  <tr className="bg-white/5">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">Monthly EMI Obligation</td>
                    <td className="py-2.5 px-3 font-bold text-white">{formatCurrency(comparisonCalculations.scenarioA.emi, currency)}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{formatCurrency(comparisonCalculations.scenarioB.emi, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                      {comparisonCalculations.emiDifference > 0
                        ? `-${formatCurrency(comparisonCalculations.emiDifference, currency)}/mo`
                        : `+${formatCurrency(Math.abs(comparisonCalculations.emiDifference), currency)}/mo`}
                    </td>
                  </tr>
                  <tr className="bg-emerald-500/10">
                    <td className="py-2.5 px-3 font-sans font-bold text-emerald-300">Total Interest Liability</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{formatCurrency(comparisonCalculations.scenarioA.totalInterest, currency)}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{formatCurrency(comparisonCalculations.scenarioB.totalInterest, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {comparisonCalculations.interestDifference > 0
                        ? `Save ${formatCurrency(comparisonCalculations.interestDifference, currency)}`
                        : `Cost +${formatCurrency(Math.abs(comparisonCalculations.interestDifference), currency)}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">Interest-to-Principal Ratio</td>
                    <td className="py-2.5 px-3">{comparisonCalculations.scenarioA.interestRatio.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{comparisonCalculations.scenarioB.interestRatio.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right">
                      {Math.abs(comparisonCalculations.scenarioA.interestRatio - comparisonCalculations.scenarioB.interestRatio).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Opportunity Cost Note */}
            <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/5 text-xs text-slate-400 leading-relaxed">
              <strong className="text-white block mb-1">Senior Underwriter Cash-Flow Insight:</strong>
              {comparisonCalculations.scenarioB.months < comparisonCalculations.scenarioA.months ? (
                <>
                  Shortening your tenure from {scenarioA.tenureYears} to {scenarioB.tenureYears} years increases your monthly EMI by {formatCurrency(Math.abs(comparisonCalculations.emiDifference), currency)}/mo, but prevents {formatCurrency(comparisonCalculations.savingsAmount, currency)} from being siphoned away into institutional interest. Ensure your FOIR remains safely below 45% before committing.
                </>
              ) : (
                <>
                  Extending your tenure lowers your monthly instalment, giving your monthly budget greater breathing room, but incurs extra compounding interest over the loan life cycle.
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
