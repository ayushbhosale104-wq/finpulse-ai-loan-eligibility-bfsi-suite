import React, { useState, useMemo } from 'react';
import { CurrencySymbol, SavedRecord } from '../types/financial';
import {
  calculatePrepaymentImpact,
  copyTableToClipboard,
  formatCurrency,
  generateAmortization,
} from '../utils/calculations';
import {
  Calculator,
  PieChart,
  TrendingDown,
  Calendar,
  Download,
  Copy,
  Check,
  BookmarkCheck,
  Bot,
  HelpCircle,
  Table,
} from 'lucide-react';

interface EmiCalculatorProps {
  currency: CurrencySymbol;
  onSaveRecord: (record: SavedRecord) => void;
  onSendToBot: (prompt: string, contextData: any) => void;
}

export const EmiCalculator: React.FC<EmiCalculatorProps> = ({
  currency,
  onSaveRecord,
  onSendToBot,
}) => {
  const [principal, setPrincipal] = useState<number>(100000);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years');
  const [tenureMonthsInput, setTenureMonthsInput] = useState<number>(180);

  // Prepayment Simulator inputs
  const [extraMonthly, setExtraMonthly] = useState<number>(100);
  const [annualLumpSum, setAnnualLumpSum] = useState<number>(1000);

  // View state
  const [scheduleView, setScheduleView] = useState<'yearly' | 'monthly'>('yearly');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const months = useMemo(() => {
    return tenureUnit === 'years' ? tenureYears * 12 : tenureMonthsInput;
  }, [tenureUnit, tenureYears, tenureMonthsInput]);

  // Generate Base Amortization
  const emiResult = useMemo(() => {
    return generateAmortization(principal, annualRate, months);
  }, [principal, annualRate, months]);

  // Generate Prepayment Simulation
  const prepaymentImpact = useMemo(() => {
    return calculatePrepaymentImpact(
      principal,
      annualRate,
      months,
      extraMonthly,
      annualLumpSum
    );
  }, [principal, annualRate, months, extraMonthly, annualLumpSum]);

  // Copy schedule table formatted for Google Sheets
  const handleCopyForSheets = async () => {
    const isYearly = scheduleView === 'yearly';
    const headers = isYearly
      ? ['Year', 'Principal Paid', 'Interest Paid', 'Closing Balance']
      : ['Month', 'Opening Balance', 'EMI', 'Principal Paid', 'Interest Paid', 'Closing Balance'];

    const rows = isYearly
      ? emiResult.yearlySchedule.map((y) => [
          `Year ${y.year}`,
          y.principalPaid,
          y.interestPaid,
          y.closingBalance,
        ])
      : emiResult.schedule.map((m) => [
          `Month ${m.month}`,
          m.openingBalance,
          m.emi,
          m.principal,
          m.interest,
          m.closingBalance,
        ]);

    const success = await copyTableToClipboard(headers, rows);
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  const handleSave = () => {
    const record: SavedRecord = {
      id: 'EMI-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      type: 'EMI Plan',
      title: `EMI Schedule (${formatCurrency(principal, currency)} @ ${annualRate}%)`,
      details: {
        principal: formatCurrency(principal, currency),
        rate: `${annualRate}%`,
        tenure: `${months} Months`,
        monthlyEmi: formatCurrency(emiResult.monthlyEmi, currency),
        totalInterest: formatCurrency(emiResult.totalInterest, currency),
        totalPayment: formatCurrency(emiResult.totalPayment, currency),
      },
      summary: `Loan: ${formatCurrency(principal, currency)} | EMI: ${formatCurrency(emiResult.monthlyEmi, currency)}/mo | Interest: ${formatCurrency(emiResult.totalInterest, currency)}`,
    };

    onSaveRecord(record);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleConsultAyush = () => {
    const prompt = `I am structuring an EMI schedule for a loan of ${currency}${principal.toLocaleString()} at ${annualRate}% interest for ${months} months. Monthly EMI is ${currency}${emiResult.monthlyEmi.toLocaleString()}, with total interest of ${currency}${emiResult.totalInterest.toLocaleString()}. If I prepay ${currency}${extraMonthly.toLocaleString()}/mo, can you explain the mathematical benefit and whether prepayment beats equity investing?`;
    onSendToBot(prompt, {
      currency,
      requestedLoan: principal,
      creditScore: 750,
      monthlyIncome: emiResult.monthlyEmi * 2.5,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-emerald-950/40 border border-teal-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 mb-2">
              <Calculator className="w-3.5 h-3.5" />
              Dynamic Loan Amortization Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              EMI & Prepayment Calculator
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Simulate monthly loan repayments, interest-to-principal proportions, and discover how modest prepayments can shave thousands off your interest liability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all shadow-sm"
            >
              <BookmarkCheck className="w-4 h-4 text-teal-400" />
              {savedSuccess ? 'Saved to Records!' : 'Save Calculation'}
            </button>
            <button
              onClick={handleConsultAyush}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-lg shadow-teal-500/20 transition-all"
            >
              <Bot className="w-4 h-4 text-teal-100" />
              Ask Ayush
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-6">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              Loan Principal & Financing Terms
            </h2>

            {/* Principal Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Principal Loan Amount
                </label>
                <span className="text-sm font-bold font-mono text-teal-400">
                  {formatCurrency(principal, currency)}
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={1500000}
                step={2500}
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  {currency}
                </span>
                <input
                  type="number"
                  value={principal || ''}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-800/70 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Annual Interest Rate */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Annual Interest Rate (%)
                </label>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {annualRate}%
                </span>
              </div>
              <input
                type="range"
                min={3.5}
                max={28}
                step={0.1}
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex gap-2 mt-2">
                {[7.5, 8.5, 9.5, 11.5, 14.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setAnnualRate(rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      annualRate === rate
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Tenure with Unit Toggle */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-slate-300">
                  Tenure: {months} Months ({Number((months / 12).toFixed(1))} Years)
                </label>
                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-white/5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTenureUnit('years')}
                    className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                      tenureUnit === 'years' ? 'bg-teal-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    Years
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenureUnit('months')}
                    className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                      tenureUnit === 'months' ? 'bg-teal-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    Months
                  </button>
                </div>
              </div>

              {tenureUnit === 'years' ? (
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              ) : (
                <input
                  type="range"
                  min={6}
                  max={360}
                  step={6}
                  value={tenureMonthsInput}
                  onChange={(e) => setTenureMonthsInput(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              )}
            </div>
          </div>

          {/* Prepayment Optimizer Card */}
          <div className="rounded-3xl bg-slate-900/60 border border-teal-500/20 p-5 sm:p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                Prepayment Impact Simulator
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                Save Thousands
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Extra Monthly Prepayment ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={extraMonthly}
                    onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Annual Lump-Sum ({currency}/year)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={annualLumpSum}
                    onChange={(e) => setAnnualLumpSum(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
            </div>

            {/* Savings Result */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-300 block">Total Interest Saved:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(prepaymentImpact.interestSaved, currency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-300 block">Loan Finished Earlier By:</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {Math.floor(prepaymentImpact.monthsSaved / 12)}y {prepaymentImpact.monthsSaved % 12}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: Payment Summary & Proportions */}
        <div className="lg:col-span-6 space-y-5">
          {/* Summary Box */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-6">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Calculated Monthly EMI
              </span>
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-400 tracking-tight mt-1 block">
                {formatCurrency(emiResult.monthlyEmi, currency)}
              </span>
              <span className="text-xs text-slate-400 mt-2 block">
                Total for {months} monthly instalments
              </span>
            </div>

            {/* Principal vs Interest Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                  Principal Amount
                </div>
                <span className="text-lg font-bold font-mono text-white block">
                  {formatCurrency(principal, currency)}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(100 - emiResult.interestRatio).toFixed(1)}% of total
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  Total Interest
                </div>
                <span className="text-lg font-bold font-mono text-amber-400 block">
                  {formatCurrency(emiResult.totalInterest, currency)}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {emiResult.interestRatio}% of total
                </span>
              </div>
            </div>

            {/* Visual Proportion Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Principal ({formatCurrency(principal, currency)})</span>
                <span>Interest ({formatCurrency(emiResult.totalInterest, currency)})</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="bg-teal-400 h-full transition-all duration-300"
                  style={{ width: `${100 - emiResult.interestRatio}%` }}
                  title="Principal"
                ></div>
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${emiResult.interestRatio}%` }}
                  title="Interest"
                ></div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                Total Payable: <strong className="text-white font-mono">{formatCurrency(emiResult.totalPayment, currency)}</strong>
              </div>
            </div>
          </div>

          {/* Quick Schedule Preview & Sheets Export */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Amortization Schedule Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-800 p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => setScheduleView('yearly')}
                    className={`px-2 py-0.5 rounded ${
                      scheduleView === 'yearly' ? 'bg-teal-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    Yearly
                  </button>
                  <button
                    onClick={() => setScheduleView('monthly')}
                    className={`px-2 py-0.5 rounded ${
                      scheduleView === 'monthly' ? 'bg-teal-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
                <button
                  onClick={handleCopyForSheets}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all"
                  title="Copy table formatted for Google Sheets or Excel"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy for Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Mini Table */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40 scrollbar-thin">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur text-slate-400 text-[11px] border-b border-white/5">
                  <tr>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Principal</th>
                    <th className="py-2 px-3">Interest</th>
                    <th className="py-2 px-3">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {scheduleView === 'yearly'
                    ? emiResult.yearlySchedule.map((row) => (
                        <tr key={row.year} className="hover:bg-white/5">
                          <td className="py-1.5 px-3 text-teal-400">Year {row.year}</td>
                          <td className="py-1.5 px-3">{formatCurrency(row.principalPaid, currency)}</td>
                          <td className="py-1.5 px-3 text-amber-400/80">{formatCurrency(row.interestPaid, currency)}</td>
                          <td className="py-1.5 px-3 text-slate-400">{formatCurrency(row.closingBalance, currency)}</td>
                        </tr>
                      ))
                    : emiResult.schedule.slice(0, 24).map((row) => (
                        <tr key={row.month} className="hover:bg-white/5">
                          <td className="py-1.5 px-3 text-teal-400">M {row.month}</td>
                          <td className="py-1.5 px-3">{formatCurrency(row.principal, currency)}</td>
                          <td className="py-1.5 px-3 text-amber-400/80">{formatCurrency(row.interest, currency)}</td>
                          <td className="py-1.5 px-3 text-slate-400">{formatCurrency(row.closingBalance, currency)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {scheduleView === 'monthly' && emiResult.schedule.length > 24 && (
              <p className="text-[10px] text-slate-500 text-center">
                Showing first 24 months. Click "Copy for Sheets" to get all {months} months in Google Sheets.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
