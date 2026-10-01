export type CurrencySymbol = '$' | '₹' | '€' | '£';

export type LoanCategory =
  | 'Home Loan'
  | 'Personal Loan'
  | 'Auto / Vehicle Loan'
  | 'Education Loan'
  | 'Business Loan'
  | 'Loan Against Property';

export type EmploymentType =
  | 'Salaried (Permanent)'
  | 'Self-Employed Professional'
  | 'Business Owner'
  | 'Gig / Contract Freelancer';

export interface LoanInputParams {
  monthlyIncome: number;
  existingEmis: number;
  requestedAmount: number;
  category: LoanCategory;
  tenureYears: number;
  interestRate: number;
  creditScore: number;
  coApplicantIncome: number;
  employmentType: EmploymentType;
}

export interface EligibilityResult {
  requestedAmount: number;
  computedEmi: number;
  foir: number;
  maxAllowableEmi: number;
  maxEligibleLoan: number;
  status: 'Approved' | 'Conditional' | 'High Risk';
  approvalChance: number;
  riskLevel: 'Low Risk' | 'Moderate Risk' | 'Elevated Risk' | 'Critical Risk';
  dtiDeficitOrSurplus: number;
  strengths: string[];
  flags: string[];
  strategies: string[];
  aiAudit?: {
    summary: string;
    approvalChance: number;
    riskLevel: string;
    strengths: string[];
    flags: string[];
    strategies: string[];
    recommendedAction: string;
  };
}

export interface CreditProfileParams {
  score: number;
  paymentHistory: 'Never Missed' | '1-2 Missed Late' | 'Frequent 60+ Days Late';
  utilization: number; // percentage (0 - 100)
  creditAge: '< 2 Years' | '2 - 5 Years' | '5 - 10 Years' | '10+ Years';
  creditMix: 'Only Credit Card' | 'Only Personal Loan' | 'Balanced (Secured + Unsecured)';
  inquiries: number; // count in last 6 months
}

export interface CreditDiagnosisResult {
  score: number;
  scoreBand: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  bandColor: string;
  factorImpacts: {
    name: string;
    weight: string;
    status: 'Optimal' | 'Warning' | 'Critical';
    detail: string;
  }[];
  aiAdvice?: {
    diagnosis: string;
    keyIssue: string;
    thirtyDayAction: string;
    sixtyDayAction: string;
    ninetyDayAction: string;
    projectedBoost: string;
    proTips?: string[];
  };
}

export interface AmortizationRow {
  month: number;
  year: number;
  openingBalance: number;
  emi: number;
  principal: number;
  interest: number;
  closingBalance: number;
}

export interface EmiResult {
  principal: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  interestRatio: number; // interest as % of total
  schedule: AmortizationRow[];
  yearlySchedule: {
    year: number;
    principalPaid: number;
    interestPaid: number;
    closingBalance: number;
  }[];
}

export interface PrepaymentAnalysis {
  originalTotalInterest: number;
  originalTenureMonths: number;
  revisedTotalInterest: number;
  revisedTenureMonths: number;
  interestSaved: number;
  monthsSaved: number;
}

export interface SavedRecord {
  id: string;
  timestamp: string;
  type: 'Loan Eligibility' | 'EMI Plan' | 'Credit Analysis';
  title: string;
  details: Record<string, any>;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ayush';
  text: string;
  timestamp: string;
  chips?: string[];
}
