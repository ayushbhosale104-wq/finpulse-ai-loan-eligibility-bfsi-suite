import React, { useState, useMemo, useRef } from 'react';
import { SavedRecord } from '../types/financial';
import { copyTableToClipboard, exportToCSV, parseCSVToRecords } from '../utils/calculations';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  History,
  Download,
  Copy,
  Trash2,
  Check,
  FileSpreadsheet,
  Layers,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calculator,
  Gauge,
  PlusCircle,
  Award,
  Upload,
  FileText,
  Database,
  ArrowDownToLine,
  FileCheck,
} from 'lucide-react';

interface HistoryLedgerProps {
  records: SavedRecord[];
  currentScore?: number;
  theme?: 'night' | 'light';
  onSaveRecord?: (record: SavedRecord) => void;
  onClearRecords: () => void;
  onDeleteRecord: (id: string) => void;
  onSelectRecord?: (record: SavedRecord) => void;
}

export const HistoryLedger: React.FC<HistoryLedgerProps> = ({
  records,
  currentScore = 745,
  theme = 'night',
  onSaveRecord,
  onClearRecords,
  onDeleteRecord,
}) => {
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [loggedSuccess, setLoggedSuccess] = useState<boolean>(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<'detailed' | 'standard'>('detailed');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract and format credit score timeline points for recharts
  const creditTrendData = useMemo(() => {
    const dataPoints: {
      id: string;
      timestamp: string;
      label: string;
      score: number;
      band: string;
      utilization?: string;
    }[] = [];

    // Scan records to extract credit score entries
    records.forEach((r) => {
      let score: number | undefined;

      if (typeof r.details?.score === 'number') {
        score = r.details.score;
      } else if (typeof r.details?.creditScore === 'number') {
        score = r.details.creditScore;
      } else {
        // Parse from summary or title if needed
        const match = r.summary.match(/Score:\s*(\d{3})/i) || r.title.match(/(\d{3})/);
        if (match) {
          score = parseInt(match[1], 10);
        }
      }

      if (score && score >= 300 && score <= 900) {
        let band = 'Good';
        if (score >= 800) band = 'Excellent';
        else if (score >= 740) band = 'Very Good';
        else if (score >= 670) band = 'Good';
        else if (score >= 580) band = 'Fair';
        else band = 'Poor';

        dataPoints.push({
          id: r.id,
          timestamp: r.timestamp,
          label: r.timestamp,
          score,
          band,
          utilization: r.details?.utilization,
        });
      }
    });

    // Chronological order: earliest on left, latest on right
    return dataPoints.slice().reverse();
  }, [records]);

  // Statistics derived from trend data
  const trendStats = useMemo(() => {
    if (!creditTrendData.length) {
      return {
        latest: currentScore,
        earliest: currentScore,
        change: 0,
        peak: currentScore,
        low: currentScore,
        band: currentScore >= 740 ? 'Very Good' : 'Good',
      };
    }
    const scores = creditTrendData.map((d) => d.score);
    const latest = scores[scores.length - 1];
    const earliest = scores[0];
    const change = latest - earliest;
    const peak = Math.max(...scores);
    const low = Math.min(...scores);
    const latestEntry = creditTrendData[creditTrendData.length - 1];

    return {
      latest,
      earliest,
      change,
      peak,
      low,
      band: latestEntry.band,
    };
  }, [creditTrendData, currentScore]);

  // Recharts Y-axis domain
  const yDomain = useMemo(() => {
    if (!creditTrendData.length) return [600, 850];
    const min = Math.min(...creditTrendData.map((d) => d.score));
    const max = Math.max(...creditTrendData.map((d) => d.score));
    return [Math.max(300, min - 30), Math.min(900, max + 30)];
  }, [creditTrendData]);

  // Log current score to records
  const handleLogCurrentScore = () => {
    if (!onSaveRecord) return;
    let band = 'Good';
    if (currentScore >= 800) band = 'Excellent';
    else if (currentScore >= 740) band = 'Very Good';
    else if (currentScore >= 670) band = 'Good';
    else if (currentScore >= 580) band = 'Fair';
    else band = 'Poor';

    const newRecord: SavedRecord = {
      id: 'CRED-' + Date.now().toString().slice(-6),
      timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'Credit Analysis',
      title: `Credit Score Audit (${currentScore} - ${band})`,
      details: { score: currentScore, band, utilization: '20%' },
      summary: `Score: ${currentScore} (${band}) | Logged from History Tracker`,
    };

    onSaveRecord(newRecord);
    setLoggedSuccess(true);
    setTimeout(() => setLoggedSuccess(false), 2500);
  };

  // CSV Export feature
  const handleDownloadCSV = (mode: 'detailed' | 'standard' = exportMode, singleRecord?: SavedRecord) => {
    const targetRecords = singleRecord ? [singleRecord] : records;
    if (!targetRecords.length) return;

    const filename = singleRecord
      ? `FinPulse_Record_${singleRecord.id}.csv`
      : `FinPulse_Financial_Records_Backup_${new Date().toISOString().split('T')[0]}.csv`;

    const downloadedName = exportToCSV(targetRecords, filename, mode);
    setDownloadNotification(`Backup downloaded: ${downloadedName}`);
    setTimeout(() => setDownloadNotification(null), 4000);
  };

  // CSV Import / Restore feature
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVToRecords(text);
        if (parsed.length > 0 && onSaveRecord) {
          parsed.forEach((r) => onSaveRecord(r));
          setImportStatus(`Successfully restored ${parsed.length} record(s) from CSV backup!`);
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('No valid financial records found in the uploaded file.');
          setTimeout(() => setImportStatus(null), 3500);
        }
      } catch (err) {
        console.error(err);
        setImportStatus('Error parsing CSV file. Please ensure it was exported from FinPulse.');
        setTimeout(() => setImportStatus(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  const handleCopyForSheets = async () => {
    const headers = ['Record ID', 'Timestamp', 'Type', 'Title', 'Summary'];
    const rows = records.map((r) => [
      r.id,
      r.timestamp,
      r.type,
      r.title,
      r.summary,
    ]);

    const success = await copyTableToClipboard(headers, rows);
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Loan Eligibility':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'EMI Plan':
        return <Calculator className="w-4 h-4 text-teal-400" />;
      case 'Credit Analysis':
        return <Gauge className="w-4 h-4 text-cyan-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  // Custom Glassmorphism Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isLight = theme === 'light';
      return (
        <div
          className={`rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl text-xs space-y-1 z-50 ${
            isLight
              ? 'bg-white/95 border-cyan-500/40 text-slate-800 shadow-slate-200/80'
              : 'bg-slate-900/95 border-cyan-500/40 text-slate-100'
          }`}
        >
          <div
            className={`text-[11px] font-mono border-b pb-1 ${
              isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-white/10'
            }`}
          >
            {data.timestamp}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className={`text-2xl font-black font-mono ${
                isLight ? 'text-cyan-600' : 'text-cyan-300'
              }`}
            >
              {data.score}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
              {data.band}
            </span>
          </div>
          {data.utilization && (
            <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Revolving Utilization: <span className="font-mono font-semibold">{data.utilization}</span>
            </div>
          )}
          <div className="text-[10px] text-slate-500 pt-0.5">
            {data.score >= 750 ? '★ Prime Institutional Tier' : 'Standard Lending Tier'}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/60 via-slate-800/60 to-slate-900/60 border border-white/10 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20 mb-2">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Transparent Session Persistence & Analytics
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Financial Records & Credit Score Evolution
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Track your longitudinal credit score trajectory powered by Recharts, review your financial simulation logs, and export your complete record history as a CSV backup.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSaveRecord && (
              <button
                onClick={handleLogCurrentScore}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all shadow-sm"
                title="Log current credit score into timeline"
              >
                {loggedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Logged to Trend!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-cyan-400" />
                    <span>Log Score ({currentScore})</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopyForSheets}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 transition-all disabled:opacity-40"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied for Sheets!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy for Sheets (TSV)</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownloadCSV()}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40"
              title="Export all financial records to a downloadable CSV backup file"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV Backup</span>
            </button>

            {records.length > 0 && (
              <button
                onClick={onClearRecords}
                className="p-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                title="Clear All Records"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Download / Import Feedback Notification */}
      {downloadNotification && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300 animate-fadeIn">
          <FileCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 font-mono">{downloadNotification}</div>
          <span className="text-[11px] text-emerald-400 font-sans">Ready for Excel & Google Sheets</span>
        </div>
      )}

      {importStatus && (
        <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-300 animate-fadeIn">
          <Database className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <div className="flex-1 font-mono">{importStatus}</div>
        </div>
      )}

      {/* DEDICATED FINANCIAL BACKUP & CSV EXPORT CONTROL PANEL */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Financial Records Backup Center (CSV)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Download a complete, offline-ready CSV ledger containing all loan calculations, credit profiles, and FOIR metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Export Format:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => setExportMode('detailed')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  exportMode === 'detailed'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detailed (17 Fields)
              </button>
              <button
                type="button"
                onClick={() => setExportMode('standard')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  exportMode === 'standard'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Export Action Card */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Full Database CSV Backup
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Includes monthly income, requested amounts, tenure, FOIR/DTI, credit ratings, and underwriter notes formatted with UTF-8 BOM.
              </p>
            </div>
            <button
              onClick={() => handleDownloadCSV(exportMode)}
              disabled={records.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Download {records.length} Record(s) as CSV
            </button>
          </div>

          {/* Quick Google Sheets Sync Card */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
                <Copy className="w-4 h-4 text-cyan-400" />
                Copy for Direct Sheets Paste
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Copies all ledger columns as tab-separated values (TSV) directly to your clipboard so you can press <kbd className="px-1 py-0.5 rounded bg-slate-700 font-mono text-[10px]">Ctrl+V</kbd> inside Google Sheets.
              </p>
            </div>
            <button
              onClick={handleCopyForSheets}
              disabled={records.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all disabled:opacity-40"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSuccess ? 'Copied to Clipboard!' : 'Copy TSV for Google Sheets'}
            </button>
          </div>

          {/* Restore / Import Card */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
                <Upload className="w-4 h-4 text-teal-400" />
                Restore from CSV Backup
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload any previously saved FinPulse CSV backup file to merge historical simulations into this current session.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                Upload CSV File to Restore
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS CREDIT SCORE TREND VISUALIZATION CARD */}
      <div className="rounded-3xl bg-slate-900/60 border border-cyan-500/30 p-5 sm:p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Credit Score Trajectory Over Time
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Historical progression based on your recorded credit health evaluations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Prime Tier (750+)
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Good Tier (670+)
            </span>
          </div>
        </div>

        {/* Quick KPI stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[11px] text-slate-400">Latest Recorded Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-cyan-300">
                {trendStats.latest}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {trendStats.band}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[11px] text-slate-400">Net Score Evolution</span>
            <div className="flex items-center gap-1.5">
              {trendStats.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
              <span
                className={`text-2xl font-black font-mono ${
                  trendStats.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trendStats.change >= 0 ? `+${trendStats.change}` : trendStats.change} pts
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[11px] text-slate-400">Historical Peak</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">
                {trendStats.peak}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">/ 900</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[11px] text-slate-400">Distance to Prime (750+)</span>
            <div className="flex items-baseline gap-1.5">
              {trendStats.latest >= 750 ? (
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <Award className="w-4 h-4" /> Qualified for Prime
                </span>
              ) : (
                <span className="text-2xl font-black font-mono text-amber-400">
                  {750 - trendStats.latest} pts away
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recharts Area / Line Chart */}
        <div className="w-full h-64 sm:h-72 pt-2">
          {creditTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={creditTrendData}
                margin={{ top: 10, right: 25, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke={theme === 'light' ? '#94a3b8' : '#64748b'}
                  tick={{ fontSize: 11, fill: theme === 'light' ? '#475569' : '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  domain={yDomain}
                  stroke={theme === 'light' ? '#94a3b8' : '#64748b'}
                  tick={{ fontSize: 11, fill: theme === 'light' ? '#475569' : '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(val) => `${val}`}
                />
                <ReferenceLine
                  y={750}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Prime 750',
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <ReferenceLine
                  y={670}
                  stroke="#06b6d4"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Good 670',
                    fill: '#06b6d4',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#scoreGlow)"
                  dot={{
                    r: 4.5,
                    fill: '#06b6d4',
                    stroke: '#07090e',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#22d3ee',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <Gauge className="w-8 h-8 mb-2 opacity-50" />
              <span>No credit score data recorded yet.</span>
            </div>
          )}
        </div>
      </div>

      {/* Records Table Card */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Saved Financial Records ({records.length})
          </h2>
          <span className="text-xs text-slate-400">LocalStorage Session Active</span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium text-slate-300">No records saved yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Run a Loan Eligibility check, Credit Audit, or EMI calculation and click "Save Record" to store them here for spreadsheet export.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-white/10 text-slate-400 text-[11px]">
                <tr>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Title / Application</th>
                  <th className="py-3 px-3">Summary Details</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium bg-slate-800 border border-white/5">
                        {getTypeIcon(r.type)}
                        {r.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white font-sans">
                      {r.title}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-xs max-w-md">
                      {r.summary}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {r.timestamp}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadCSV('detailed', r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Export this record as CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
