import React, { useState } from 'react';
import { CurrencySymbol } from '../types/financial';
import { requestFinancialTips } from '../services/aiService';
import { formatCurrency } from '../utils/calculations';
import {
  Lightbulb,
  Sparkles,
  Shield,
  Zap,
  Percent,
  Bookmark,
  Bot,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Loader2,
} from 'lucide-react';

interface FinancialTipsProps {
  currency: CurrencySymbol;
  userIncome?: number;
  userDebt?: number;
  onSendToBot: (prompt: string, contextData: any) => void;
}

export const FinancialTips: React.FC<FinancialTipsProps> = ({
  currency,
  userIncome = 6500,
  userDebt = 600,
  onSendToBot,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [incomeForRule, setIncomeForRule] = useState<number>(userIncome);

  // 50/30/20 rule calculation
  const needs = Math.round(incomeForRule * 0.5);
  const wants = Math.round(incomeForRule * 0.3);
  const savings = Math.round(incomeForRule * 0.2);

  // Default curated BFSI tips
  const [tips, setTips] = useState<
    { title: string; description: string; tag: string; icon?: any }[]
  >([
    {
      title: 'The 30% Credit Utilization Ceiling',
      description:
        'Bureau scoring algorithms (CIBIL/FICO) flag borrowers who tap into more than 30% of their total revolving limits as high risk. Keeping utilization below 10-15% can quickly add 30-50 points to your score.',
      tag: 'Credit Health',
    },
    {
      title: 'Tenure Squeeze vs Rate Negotiation',
      description:
        'Negotiating a 0.25% lower interest rate saves money, but shaving just 3 years off a 20-year loan saves almost 3x more in total compounding interest payout.',
      tag: 'Smart Borrowing',
    },
    {
      title: 'Debt Avalanche vs Debt Snowball',
      description:
        'Avalanche targets the highest interest rate debt first, delivering mathematically optimal interest savings. Snowball targets smallest balances first for psychological momentum.',
      tag: 'Debt Elimination',
    },
    {
      title: 'Tax Deductions on Home Financing',
      description:
        'Home loan repayments offer dual tax deductions: interest paid can often be deducted against taxable income, while principal repayment falls under eligible investment exemptions.',
      tag: 'Tax Strategy',
    },
    {
      title: 'The 3-to-6 Month Liquidity Moat',
      description:
        'Before aggressively prepaying low-interest mortgage debt, ensure you have at least 6 months of non-negotiable living expenses and EMIs parked in liquid instruments.',
      tag: 'Emergency Shield',
    },
    {
      title: 'FOIR Golden Rule for Dual Incomes',
      description:
        'When purchasing property with a spouse, keep individual FOIR under 35% so that if one partner pauses work, the loan obligations remain manageable without distress.',
      tag: 'Underwriting',
    },
  ]);

  const categories = [
    'All',
    'Credit Health',
    'Smart Borrowing',
    'Debt Elimination',
    'Tax Strategy',
    'Emergency Shield',
  ];

  const filteredTips =
    selectedCategory === 'All'
      ? tips
      : tips.filter((t) => t.tag === selectedCategory);

  const handleGenerateAiTips = async () => {
    setIsGenerating(true);
    const res = await requestFinancialTips(selectedCategory, {
      monthlyIncome: userIncome,
      existingEmis: userDebt,
    });
    if (res && res.tips) {
      setTips((prev) => [...res.tips, ...prev.slice(0, 4)]);
    }
    setIsGenerating(false);
  };

  const handleConsultAyush = (tipTitle: string) => {
    onSendToBot(
      `Can you explain the strategy behind "${tipTitle}" in deeper detail and how I should implement it for my personal situation?`,
      { monthlyIncome: userIncome, existingEmis: userDebt }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-emerald-950/40 border border-amber-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              BFSI Financial Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Financial Tips & Underwriting Insights
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Curated banking best practices, tax sheltering rules, and personal wealth strategies verified by institutional lending criteria.
            </p>
          </div>

          <button
            onClick={handleGenerateAiTips}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Synthesizing Tips...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-100" />
                Generate Tailored AI Tips
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive 50/30/20 Budgeting Calculator */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Interactive 50 / 30 / 20 Budgeting Rule for Borrowers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard bank budgeting framework to ensure long-term debt sustainability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Monthly Income:</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                {currency}
              </span>
              <input
                type="number"
                value={incomeForRule}
                onChange={(e) => setIncomeForRule(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-6 pr-2 py-1 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300">50% Essential Needs</span>
              <span className="text-[10px] text-emerald-400/80">Rent, EMIs, Groceries</span>
            </div>
            <span className="text-xl font-bold font-mono text-white block">
              {formatCurrency(needs, currency)}
            </span>
            <p className="text-[11px] text-slate-400">
              Total fixed obligations (FOIR) must live within this boundary.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300">30% Lifestyle & Wants</span>
              <span className="text-[10px] text-cyan-400/80">Dining, Travel, Subscriptions</span>
            </div>
            <span className="text-xl font-bold font-mono text-white block">
              {formatCurrency(wants, currency)}
            </span>
            <p className="text-[11px] text-slate-400">
              Discretionary spending that can be pruned in a pinch.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-300">20% Debt Prepay & Wealth</span>
              <span className="text-[10px] text-teal-400/80">Investments, Prepayments</span>
            </div>
            <span className="text-xl font-bold font-mono text-white block">
              {formatCurrency(savings, currency)}
            </span>
            <p className="text-[11px] text-slate-400">
              Allocate toward extra principal prepayments or emergency reserves.
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTips.map((tip, idx) => (
          <div
            key={idx}
            className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-amber-500/30 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {tip.tag}
                </span>
                <Lightbulb className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                {tip.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {tip.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => handleConsultAyush(tip.title)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Discuss with Ayush Bot <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
