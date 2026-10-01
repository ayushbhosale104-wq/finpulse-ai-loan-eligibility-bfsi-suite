import React, { useState, useEffect } from 'react';
import { CurrencySymbol, SavedRecord } from './types/financial';
import { Navbar } from './components/Navbar';
import { LoanChecker } from './components/LoanChecker';
import { CreditAnalyzer } from './components/CreditAnalyzer';
import { EmiCalculator } from './components/EmiCalculator';
import { FinancialTips } from './components/FinancialTips';
import { AyushBot } from './components/AyushBot';
import { HistoryLedger } from './components/HistoryLedger';
import { Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'loan' | 'credit' | 'emi' | 'tips' | 'bot' | 'history'
  >('loan');

  // Currency selection (persisted)
  const [currency, setCurrency] = useState<CurrencySymbol>(() => {
    return (localStorage.getItem('finpulse_currency') as CurrencySymbol) || '$';
  });

  // Theme selection: 'night' (Deep Night) vs 'light' (Clean Light)
  const [theme, setTheme] = useState<'night' | 'light'>(() => {
    return (localStorage.getItem('finpulse_theme') as 'night' | 'light') || 'night';
  });

  // Credit Score synced across tools
  const [creditScore, setCreditScore] = useState<number>(745);

  // Active profile context shared with Bot Ayush
  const [activeContext, setActiveContext] = useState<any>({
    currency: '$',
    monthlyIncome: 6500,
    existingEmis: 600,
    requestedLoan: 120000,
    loanCategory: 'Home Loan',
    foir: 34,
    creditScore: 745,
    maxEligibleLoan: 195000,
  });

  // Floating bot modal state
  const [isBotDrawerOpen, setIsBotDrawerOpen] = useState<boolean>(false);
  const [botInitialPrompt, setBotInitialPrompt] = useState<string>('');

  // Saved records across sessions (persisted)
  const [records, setRecords] = useState<SavedRecord[]>(() => {
    const saved = localStorage.getItem('finpulse_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'REC-104',
        timestamp: 'Today, 11:30 AM',
        type: 'Credit Analysis',
        title: 'Credit Score Audit (745 - Very Good)',
        details: { score: 745, band: 'Very Good', utilization: '22%' },
        summary: 'Score: 745 | Revolving Utilization: 22% | On-Time Track Record: 100%',
      },
      {
        id: 'REC-103',
        timestamp: '1 Month Ago',
        type: 'Credit Analysis',
        title: 'Credit Score Audit (725 - Good)',
        details: { score: 725, band: 'Good', utilization: '28%' },
        summary: 'Score: 725 | Revolving Utilization: 28% | Utilization Reduced',
      },
      {
        id: 'REC-102',
        timestamp: '2 Months Ago',
        type: 'Credit Analysis',
        title: 'Credit Score Audit (705 - Good)',
        details: { score: 705, band: 'Good', utilization: '35%' },
        summary: 'Score: 705 | Revolving Utilization: 35% | 1 Inquiry Cleared',
      },
      {
        id: 'REC-101',
        timestamp: '3 Months Ago',
        type: 'Credit Analysis',
        title: 'Initial Credit Health Check (675 - Good)',
        details: { score: 675, band: 'Good', utilization: '42%' },
        summary: 'Score: 675 | High Credit Card Utilization (42%) | Baseline',
      },
      {
        id: 'REC-100',
        timestamp: 'Today, 10:15 AM',
        type: 'Loan Eligibility',
        title: 'Home Loan Pre-Qualification ($120,000)',
        details: { income: 6500, emis: 600, requested: 120000, foir: '34%' },
        summary: 'Requested $120,000 | Eligible: $195,000 | FOIR: 34% (Safe Zone) | Status: Approved',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('finpulse_currency', currency);
    setActiveContext((prev: any) => ({ ...prev, currency }));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('finpulse_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('theme-dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('finpulse_records', JSON.stringify(records));
  }, [records]);

  const handleSaveRecord = (record: SavedRecord) => {
    setRecords((prev) => [record, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearRecords = () => {
    if (window.confirm('Are you sure you want to clear all saved records from this session?')) {
      setRecords([]);
      localStorage.removeItem('finpulse_records');
    }
  };

  // Route to Bot Ayush with specific inquiry and context
  const handleSendToBot = (prompt: string, contextData: any) => {
    setActiveContext((prev: any) => ({ ...prev, ...contextData, currency }));
    setBotInitialPrompt(prompt);
    setActiveTab('bot');
  };

  return (
    <div
      className={`min-h-screen ${
        theme === 'light' ? 'bg-[#f6f8fc] text-slate-900 theme-light' : 'bg-[#07090e] text-slate-100 theme-dark'
      } flex flex-col relative transition-colors duration-300 selection:bg-emerald-500/30 selection:text-emerald-400`}
    >
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/[0.04] blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/[0.04] blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[25%] w-[50vw] h-[50vw] rounded-full bg-teal-500/[0.03] blur-[140px]"></div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        savedCount={records.length}
        openBotDrawer={() => setIsBotDrawerOpen(true)}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {activeTab === 'loan' && (
          <LoanChecker
            currency={currency}
            creditScore={creditScore}
            onSaveRecord={handleSaveRecord}
            onSendToBot={handleSendToBot}
          />
        )}

        {activeTab === 'credit' && (
          <CreditAnalyzer
            currentScore={creditScore}
            onScoreChange={setCreditScore}
            onSaveRecord={handleSaveRecord}
            onSendToBot={handleSendToBot}
          />
        )}

        {activeTab === 'emi' && (
          <EmiCalculator
            currency={currency}
            onSaveRecord={handleSaveRecord}
            onSendToBot={handleSendToBot}
          />
        )}

        {activeTab === 'tips' && (
          <FinancialTips
            currency={currency}
            userIncome={activeContext.monthlyIncome}
            userDebt={activeContext.existingEmis}
            onSendToBot={handleSendToBot}
          />
        )}

        {activeTab === 'bot' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 p-5 backdrop-blur-xl flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  Ayush - AI Senior BFSI Financial Advisor
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Real-time underwriter advice, debt consolidation strategies, and credit score boost formulas.
                </p>
              </div>
            </div>
            <AyushBot
              currency={currency}
              userContext={activeContext}
              initialPrompt={botInitialPrompt}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryLedger
            records={records}
            currentScore={creditScore}
            theme={theme}
            onSaveRecord={handleSaveRecord}
            onClearRecords={handleClearRecords}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </main>

      {/* Floating Ayush Bot Drawer Trigger (Bottom Right) */}
      {activeTab !== 'bot' && (
        <div className="fixed bottom-6 right-6 z-50">
          {isBotDrawerOpen ? (
            <div className="relative animate-scaleUp">
              <AyushBot
                currency={currency}
                userContext={activeContext}
                isFloating={true}
                onCloseFloating={() => setIsBotDrawerOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsBotDrawerOpen(true)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all group"
            >
              <div className="relative">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold block leading-none">Chat with Ayush</span>
                <span className="text-[10px] text-cyan-100 font-medium leading-tight">AI Loan Specialist</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-[#05070a]/60 text-center text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">FinPulse AI</span>
            <span>•</span>
            <span>AI-Powered BFSI Platform & Ayush Advisory Core</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Institutional lending simulations and calculations are based on standard banking underwriting guidelines (FOIR/DTI).
          </p>
        </div>
      </footer>
    </div>
  );
}
