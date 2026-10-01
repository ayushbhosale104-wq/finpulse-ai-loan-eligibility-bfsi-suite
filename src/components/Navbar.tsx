import React from 'react';
import { CurrencySymbol } from '../types/financial';
import {
  ShieldCheck,
  Calculator,
  Gauge,
  Lightbulb,
  Bot,
  History,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'loan' | 'credit' | 'emi' | 'tips' | 'bot' | 'history';
  setActiveTab: (tab: 'loan' | 'credit' | 'emi' | 'tips' | 'bot' | 'history') => void;
  currency: CurrencySymbol;
  setCurrency: (c: CurrencySymbol) => void;
  savedCount: number;
  openBotDrawer: () => void;
  theme?: 'night' | 'light';
  setTheme?: (theme: 'night' | 'light') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  savedCount,
  openBotDrawer,
  theme = 'night',
  setTheme,
}) => {
  const currencies: { symbol: CurrencySymbol; label: string }[] = [
    { symbol: '$', label: 'USD ($)' },
    { symbol: '₹', label: 'INR (₹)' },
    { symbol: '€', label: 'EUR (€)' },
    { symbol: '£', label: 'GBP (£)' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('loan')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FinPulse<span className="text-emerald-400">.AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  BFSI Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                AI Loan Eligibility & Financial Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab('loan')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'loan'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Eligibility
            </button>

            <button
              onClick={() => setActiveTab('credit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'credit'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Credit Analyzer
            </button>

            <button
              onClick={() => setActiveTab('emi')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'emi'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              EMI Calculator
            </button>

            <button
              onClick={() => setActiveTab('tips')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'tips'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              AI Tips
            </button>

            <button
              onClick={() => setActiveTab('bot')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'bot'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              Ayush Bot
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Records
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Controls: Theme Switcher, Currency Selector & Quick Bot trigger */}
          <div className="flex items-center gap-2">
            {/* Theme Switcher: Deep Night vs Clean Light */}
            {setTheme && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'night' ? 'light' : 'night')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all shadow-sm cursor-pointer"
                title={`Switch to ${theme === 'night' ? 'Clean Light' : 'Deep Night'} theme`}
              >
                {theme === 'night' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden lg:inline text-[11px] text-slate-300">Clean Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden lg:inline text-[11px] text-slate-700">Deep Night</span>
                  </>
                )}
              </button>
            )}

            {/* Currency Selector */}
            <div className="relative">
              <select
                aria-label="Select display currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
                className="appearance-none bg-slate-900/80 text-xs font-medium text-slate-200 pl-3 pr-7 py-1.5 rounded-xl border border-white/10 hover:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c.symbol} value={c.symbol} className="bg-slate-900 text-slate-100">
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-slate-400">
                ▼
              </span>
            </div>

            {/* Quick Trigger Ayush Advisor */}
            <button
              onClick={openBotDrawer}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-all shadow-sm"
              title="Chat with Ayush AI Advisor"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Advisor Ayush</span>
              <span className="sm:hidden">Ayush</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 scrollbar-none border-t border-white/5">
          {[
            { id: 'loan', label: 'Eligibility', icon: ShieldCheck },
            { id: 'credit', label: 'Credit', icon: Gauge },
            { id: 'emi', label: 'EMI', icon: Calculator },
            { id: 'tips', label: 'AI Tips', icon: Lightbulb },
            { id: 'bot', label: 'Ayush Bot', icon: Bot },
            { id: 'history', label: 'Records', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
