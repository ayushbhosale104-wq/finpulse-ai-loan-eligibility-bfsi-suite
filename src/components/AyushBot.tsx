import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, CurrencySymbol } from '../types/financial';
import { askAyushChat } from '../services/aiService';
import {
  Bot,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  RefreshCw,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AyushBotProps {
  currency: CurrencySymbol;
  userContext?: {
    currency?: CurrencySymbol;
    monthlyIncome?: number;
    existingEmis?: number;
    requestedLoan?: number;
    loanCategory?: string;
    foir?: number;
    creditScore?: number;
    maxEligibleLoan?: number;
  };
  initialPrompt?: string;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

export const AyushBot: React.FC<AyushBotProps> = ({
  currency,
  userContext,
  initialPrompt,
  isFloating = false,
  onCloseFloating,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ayush_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'ayush',
        text: `Hello! I'm **Ayush**, your AI Financial Advisor and Senior BFSI Underwriting Specialist. 

I'm here to help you navigate loan eligibility criteria, optimize your Debt-to-Income (FOIR) ratio, formulate credit score repair blueprints, and craft smart prepayment strategies.

How can I assist your financial journey today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chips: [
          'How do banks calculate FOIR?',
          'Strategies to reduce FOIR below 40%',
          'Should I prepay loan or invest?',
          'How to reach 780 credit score?',
        ],
      },
    ];
  });

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('ayush_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Handle initial prompt passed from other tools
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Web Speech API text-to-speech
  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const reply = await askAyushChat(query, historyPayload, {
        currency,
        ...userContext,
      });

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'ayush',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(reply);
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'ayush',
        text: 'I ran into a connection issue while contacting our financial underwriting core. In standard banking practices, keeping FOIR under 40% and credit utilization below 30% ensures prime eligibility. Please try asking again in a moment!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    localStorage.removeItem('ayush_chat_history');
    setMessages([
      {
        id: 'msg-welcome',
        role: 'ayush',
        text: `Conversation restarted! I am **Ayush**, your BFSI Advisor. Feel free to ask about your loan qualification, FOIR status, or credit health.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chips: [
          'How do banks calculate FOIR?',
          'Strategies to reduce FOIR below 40%',
          'Should I prepay loan or invest?',
        ],
      },
    ]);
  };

  const handleLoadContextIntoChat = () => {
    if (!userContext || !userContext.monthlyIncome) {
      handleSendMessage('What are standard loan qualification rules in banking?');
      return;
    }
    const contextPrompt = `Ayush, please analyze my live profile data:
- Monthly Income: ${currency}${userContext.monthlyIncome?.toLocaleString()}
- Existing EMIs: ${currency}${userContext.existingEmis?.toLocaleString() || 0}
- Requested Loan: ${currency}${userContext.requestedLoan?.toLocaleString() || 'N/A'}
- Computed FOIR: ${userContext.foir ? `${userContext.foir}%` : 'N/A'}
- Credit Score: ${userContext.creditScore || 'N/A'}
- Max Eligible Loan: ${currency}${userContext.maxEligibleLoan?.toLocaleString() || 'N/A'}

Provide your expert evaluation on whether I will get approved at tier-1 interest rates, and what risks the bank will flag.`;
    handleSendMessage(contextPrompt);
  };

  return (
    <div
      className={`flex flex-col ${
        isFloating
          ? 'h-[580px] w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-2xl'
          : 'h-[640px] rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl'
      } overflow-hidden`}
    >
      {/* Bot Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Ayush</h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                AI BFSI Advisor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Institutional Lending Specialist</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Audio speech toggle */}
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-2 rounded-xl text-xs transition-all ${
              speechEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title={speechEnabled ? 'Mute Speech' : 'Enable Voice Readout'}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset chat */}
          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            title="Reset Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Close if floating */}
          {isFloating && onCloseFloating && (
            <button
              onClick={onCloseFloating}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-xs font-mono"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Live Financial Context Bar (if user has active numbers) */}
      {userContext && userContext.monthlyIncome && (
        <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-[11px] text-slate-400">Active Profile:</span>
            <span className="font-mono text-[11px] font-semibold text-white">
              {currency}{userContext.monthlyIncome.toLocaleString()}/mo • FOIR: {userContext.foir || 0}%
            </span>
          </div>
          <button
            onClick={handleLoadContextIntoChat}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 whitespace-nowrap ml-2"
          >
            Sync to Chat →
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isBot = msg.role === 'ayush';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isBot ? 'items-start' : 'items-end justify-end'}`}
            >
              {isBot && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-300" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-1.5`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed backdrop-blur-md ${
                    isBot
                      ? 'bg-slate-800/80 text-slate-200 border border-white/10 rounded-tl-sm'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-sm shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {/* Format markdown-like text */}
                  <div className="whitespace-pre-line space-y-2">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph.split('**').map((chunk, cIdx) =>
                          cIdx % 2 === 1 ? (
                            <strong key={cIdx} className={isBot ? 'text-cyan-300 font-semibold' : 'font-bold'}>
                              {chunk}
                            </strong>
                          ) : (
                            chunk
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 text-[10px] text-slate-500 px-1 ${
                    isBot ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <span>{isBot ? 'Ayush' : 'You'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Optional follow-up chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.chips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSendMessage(chip)}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isBot && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-white/10 rounded-tl-sm flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></span>
              </span>
              <span className="text-xs text-slate-400">Ayush is computing financial reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ayush about loan approval, FOIR ratio, credit score..."
            disabled={isLoading}
            className="flex-1 bg-slate-800/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-95 text-white shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
