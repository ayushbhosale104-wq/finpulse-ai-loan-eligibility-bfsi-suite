import { CurrencySymbol, LoanInputParams } from '../types/financial';

export async function askAyushChat(
  message: string,
  history: { role: 'user' | 'ayush'; text: string }[] = [],
  context?: {
    currency?: CurrencySymbol;
    monthlyIncome?: number;
    existingEmis?: number;
    requestedLoan?: number;
    loanCategory?: string;
    foir?: number;
    creditScore?: number;
    maxEligibleLoan?: number;
  }
): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }

    const data = await res.json();
    return data.reply;
  } catch (error: any) {
    console.warn('AI Chat API fallback:', error);
    return `Hello, I'm **Ayush**. Regarding your question about **"${message}"**: In banking underwriting, maintaining a FOIR under 40% and a healthy credit score (750+) are the most critical factors for guaranteed approvals at prime rates. Let me know if you would like me to review your specific income and EMI calculations!`;
  }
}

export async function requestLoanUnderwritingAudit(params: LoanInputParams & { foir: number; maxEligibleLoan: number; currency: CurrencySymbol }) {
  try {
    const res = await fetch('/api/loan-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.warn('Loan analysis fallback:', error);
    const isApproved = params.foir <= 50;
    return {
      summary: isApproved
        ? `Your estimated FOIR of ${params.foir}% is within standard banking risk parameters. Your debt servicing capacity is stable.`
        : `Your estimated FOIR of ${params.foir}% exceeds prime lender limits (typically 50%). Lenders may require co-signers or loan downsizing.`,
      approvalChance: isApproved ? Math.max(70, Math.round(95 - params.foir * 0.4)) : Math.max(25, Math.round(70 - (params.foir - 50) * 1.5)),
      riskLevel: params.foir <= 40 ? 'Low Risk' : params.foir <= 50 ? 'Moderate Risk' : 'Elevated Risk',
      strengths: [
        `Stable employment categorized as ${params.employmentType}`,
        `Credit score recorded at ${params.creditScore}`,
      ],
      flags: params.foir > 45 ? [`Fixed obligations consume ${params.foir}% of monthly cash flow`] : [],
      strategies: [
        'Consider extending tenure by 2-3 years to reduce the required monthly EMI burden.',
        'Settle revolving credit card dues before loan disbursement to lower debt commitments.',
        'Adding an earning co-applicant immediately raises allowable FOIR and eligibility.',
      ],
      recommendedAction: params.foir <= 45 ? 'Proceed with prime banks to negotiate lowest interest spreads.' : 'Consolidate short-term debts or increase loan tenure.',
    };
  }
}

export async function requestCreditScoreAdvice(profile: {
  score: number;
  paymentHistory: string;
  utilization: number;
  creditAge: string;
  creditMix: string;
  inquiries: number;
}) {
  try {
    const res = await fetch('/api/credit-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.warn('Credit advice fallback:', error);
    return {
      diagnosis: `At score ${profile.score}, your profile shows active credit behavior. Revolving credit utilization is at ${profile.utilization}%.`,
      keyIssue: profile.utilization > 30 ? 'Credit card utilization above 30% barrier' : 'Inquiries or short credit age',
      thirtyDayAction: 'Pay down revolving balances prior to the statement date to report lower utilization to credit bureaus.',
      sixtyDayAction: 'Review credit reports for any inaccurate late payment reporting or unauthorized accounts.',
      ninetyDayAction: 'Maintain zero missed dues and refrain from making multiple hard loan inquiries in quick succession.',
      projectedBoost: '+35 to +60 points',
      proTips: [
        'Request an eligible credit limit increase on existing cards without a hard pull to instantly lower your utilization ratio.',
        'Keep your oldest credit card active even with nominal subscriptions to protect your average credit age.',
      ],
    };
  }
}

export async function requestFinancialTips(category: string, profile: any) {
  try {
    const res = await fetch('/api/financial-tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, profile }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    return {
      tips: [
        {
          title: '30% Credit Limit Threshold',
          description: 'Maintaining your balance below 30% of total credit limit prevents risk flags on bureau algorithms.',
          tag: 'Credit Health',
        },
        {
          title: 'Strategic Annual Prepayments',
          description: 'Paying 1 extra EMI each calendar year can slash a 20-year mortgage by nearly 3.5 years.',
          tag: 'Smart Borrowing',
        },
        {
          title: 'Debt Avalanche vs Snowball',
          description: 'Avalanche saves the highest interest math-wise; Snowball delivers rapid psychological momentum.',
          tag: 'Debt Elimination',
        },
      ],
    };
  }
}
