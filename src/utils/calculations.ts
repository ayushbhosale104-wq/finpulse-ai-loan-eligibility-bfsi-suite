import { AmortizationRow, CurrencySymbol, EmiResult, PrepaymentAnalysis, SavedRecord } from '../types/financial';

/**
 * Standard EMI Calculation Formula:
 * E = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRate <= 0) return Math.round(principal / months);

  const r = annualRate / (12 * 100);
  const factor = Math.pow(1 + r, months);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi);
}

/**
 * Calculate Maximum Loan Eligibility based on FOIR
 * Bank Underwriting Standard: Max FOIR usually 40% - 55% depending on income.
 */
export function calculateMaxLoanEligibility(
  totalIncome: number,
  existingEmis: number,
  annualRate: number,
  months: number,
  maxFoirAllowed = 50
): { maxAllowedEmi: number; maxLoanAmount: number } {
  const maxAllowedEmi = Math.max(0, Math.round(totalIncome * (maxFoirAllowed / 100) - existingEmis));
  if (maxAllowedEmi <= 0 || months <= 0) {
    return { maxAllowedEmi: 0, maxLoanAmount: 0 };
  }

  if (annualRate <= 0) {
    return { maxAllowedEmi, maxLoanAmount: maxAllowedEmi * months };
  }

  const r = annualRate / (12 * 100);
  const factor = Math.pow(1 + r, months);
  // P = E * ((1+r)^n - 1) / (r * (1+r)^n)
  const maxLoan = Math.round((maxAllowedEmi * (factor - 1)) / (r * factor));

  return {
    maxAllowedEmi,
    maxLoanAmount: Math.max(0, maxLoan),
  };
}

/**
 * Calculate FOIR (Fixed Obligation to Income Ratio / DTI)
 */
export function calculateFOIR(existingEmis: number, newEmi: number, totalIncome: number): number {
  if (totalIncome <= 0) return 100;
  const totalObligations = existingEmis + newEmi;
  const foir = (totalObligations / totalIncome) * 100;
  return Number(foir.toFixed(1));
}

/**
 * Generate full Amortization Schedule (Monthly + Yearly rollup)
 */
export function generateAmortization(principal: number, annualRate: number, months: number): EmiResult {
  const emi = calculateEMI(principal, annualRate, months);
  const r = annualRate / (12 * 100);
  let balance = principal;

  const schedule: AmortizationRow[] = [];
  const yearlyMap = new Map<number, { principalPaid: number; interestPaid: number; closingBalance: number }>();

  let totalInterest = 0;

  for (let m = 1; m <= months; m++) {
    const year = Math.ceil(m / 12);
    const interest = Math.round(balance * r);
    const principalPaid = Math.min(balance, emi - interest);
    const closingBalance = Math.max(0, balance - principalPaid);

    totalInterest += interest;

    schedule.push({
      month: m,
      year,
      openingBalance: balance,
      emi,
      principal: principalPaid,
      interest,
      closingBalance,
    });

    const currYear = yearlyMap.get(year) || { principalPaid: 0, interestPaid: 0, closingBalance: 0 };
    currYear.principalPaid += principalPaid;
    currYear.interestPaid += interest;
    currYear.closingBalance = closingBalance;
    yearlyMap.set(year, currYear);

    balance = closingBalance;
    if (balance <= 0) break;
  }

  const yearlySchedule = Array.from(yearlyMap.entries()).map(([year, val]) => ({
    year,
    principalPaid: val.principalPaid,
    interestPaid: val.interestPaid,
    closingBalance: val.closingBalance,
  }));

  const totalPayment = principal + totalInterest;
  const interestRatio = totalPayment > 0 ? Number(((totalInterest / totalPayment) * 100).toFixed(1)) : 0;

  return {
    principal,
    monthlyEmi: emi,
    totalInterest,
    totalPayment,
    interestRatio,
    schedule,
    yearlySchedule,
  };
}

/**
 * Simulate Prepayment Impact (extra monthly or annual lump-sum)
 */
export function calculatePrepaymentImpact(
  principal: number,
  annualRate: number,
  months: number,
  extraMonthly = 0,
  annualLumpSum = 0
): PrepaymentAnalysis {
  const baseResult = generateAmortization(principal, annualRate, months);
  const baseEmi = baseResult.monthlyEmi;
  const r = annualRate / (12 * 100);

  let balance = principal;
  let simulatedInterest = 0;
  let simulatedMonths = 0;

  for (let m = 1; m <= months * 2; m++) {
    if (balance <= 0) break;
    simulatedMonths = m;

    const interest = Math.round(balance * r);
    simulatedInterest += interest;

    let principalPay = baseEmi - interest + extraMonthly;

    // Apply annual lump-sum at month 12, 24, 36...
    if (m % 12 === 0 && annualLumpSum > 0) {
      principalPay += annualLumpSum;
    }

    if (principalPay > balance) {
      principalPay = balance;
    }

    balance = Math.max(0, balance - principalPay);
  }

  const interestSaved = Math.max(0, baseResult.totalInterest - simulatedInterest);
  const monthsSaved = Math.max(0, months - simulatedMonths);

  return {
    originalTotalInterest: baseResult.totalInterest,
    originalTenureMonths: months,
    revisedTotalInterest: simulatedInterest,
    revisedTenureMonths: simulatedMonths,
    interestSaved,
    monthsSaved,
  };
}

/**
 * Currency Formatter with locale sensitivity
 */
export function formatCurrency(amount: number, symbol: CurrencySymbol = '$'): string {
  const rounded = Math.round(amount);
  if (symbol === '₹') {
    // Indian numbering format (lakhs, crores)
    return '₹' + rounded.toLocaleString('en-IN');
  }
  return symbol + rounded.toLocaleString('en-US');
}

/**
 * Export Records to a clean downloadable CSV file for backup
 */
export function exportToCSV(
  records: SavedRecord[],
  filename?: string,
  mode: 'detailed' | 'standard' = 'detailed'
): string {
  if (!records.length) return '';

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `FinPulse_Financial_Records_Backup_${dateStr}.csv`;

  let csvContent = '';

  if (mode === 'detailed') {
    const headers = [
      'Record ID',
      'Timestamp',
      'Category / Type',
      'Title / Description',
      'Credit Score',
      'Credit Tier',
      'Monthly Income',
      'Existing Monthly Obligations',
      'Requested Loan Amount',
      'Loan Category',
      'Tenure',
      'Interest Rate (%)',
      'FOIR / DTI (%)',
      'Monthly EMI',
      'Max Eligible Loan',
      'Status / Approval Rating',
      'Summary Notes',
    ];

    const rows = records.map((r) => {
      const d = r.details || {};
      const score = d.score || d.creditScore || '';
      const band = d.band || '';
      const income = d.income || d.monthlyIncome || '';
      const emis = d.emis || d.existingEmis || '';
      const requested = d.requested || d.requestedAmount || '';
      const category = d.category || '';
      const tenure = d.tenure || (d.tenureYears ? `${d.tenureYears} Years` : '');
      const rate = d.rate || d.interestRate || '';
      const foir = d.foir || '';
      const emi = d.monthlyEmi || '';
      const maxEligible = d.maxEligibleLoan || '';
      const status = d.status || d.approvalScore || '';

      return [
        `"${r.id}"`,
        `"${r.timestamp}"`,
        `"${r.type}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${score}"`,
        `"${band}"`,
        `"${income}"`,
        `"${emis}"`,
        `"${requested}"`,
        `"${category}"`,
        `"${tenure}"`,
        `"${rate}"`,
        `"${foir}"`,
        `"${emi}"`,
        `"${maxEligible}"`,
        `"${status}"`,
        `"${r.summary.replace(/"/g, '""')}"`,
      ].join(',');
    });

    csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  } else {
    const headers = ['Record ID', 'Timestamp', 'Tool Type', 'Title', 'Summary Details'];
    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.timestamp}"`,
      `"${r.type}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.summary.replace(/"/g, '""')}"`,
    ]);
    csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return finalFilename;
}

/**
 * Parse uploaded CSV back into SavedRecord items for backup restoration
 */
export function parseCSVToRecords(csvText: string): SavedRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const restored: SavedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex to split comma-separated values respecting quotes
    const values: string[] = [];
    let insideQuote = false;
    let entry = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' && (c === 0 || line[c - 1] !== '\\')) {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(entry.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        entry = '';
      } else {
        entry += char;
      }
    }
    values.push(entry.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    if (values.length >= 4) {
      const id = values[0] || 'IMP-' + Date.now().toString().slice(-6) + i;
      const timestamp = values[1] || 'Restored Backup';
      const typeRaw = values[2] || 'Loan Eligibility';
      const type: SavedRecord['type'] =
        typeRaw.includes('Credit') ? 'Credit Analysis' :
        typeRaw.includes('EMI') ? 'EMI Plan' : 'Loan Eligibility';
      const title = values[3] || 'Restored Financial Record';
      const summary = values[values.length - 1] || 'Restored from CSV backup';

      restored.push({
        id,
        timestamp,
        type,
        title,
        details: {},
        summary,
      });
    }
  }

  return restored;
}

/**
 * Copy formatted spreadsheet data directly to clipboard for Google Sheets / Excel
 */
export async function copyTableToClipboard(headers: string[], rows: (string | number)[][]): Promise<boolean> {
  try {
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
