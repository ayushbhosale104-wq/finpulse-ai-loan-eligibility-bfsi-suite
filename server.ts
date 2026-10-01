import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: Ayush AI Bot Chat
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      // Intelligent fallback if API key is not yet set
      return res.json({
        reply: `Hello! I am **Ayush**, your BFSI & Loan Specialist.\n\nRegarding your question: "${message}"\n\n*Financial Underwriter Note:* In banking standards, maintaining a Debt-to-Income (FOIR) ratio below 40% and a credit score above 750 provides optimal loan approval odds at the lowest interest rates.\n\n*(Tip: Connect your Gemini API Key in the AI Studio Secrets panel to enable full real-time neural reasoning.)*`,
      });
    }

    // Prepare system instructions with Ayush persona and context
    let systemInstruction = `You are Ayush, a premier AI Financial Advisor and Senior BFSI (Banking, Financial Services, and Insurance) Underwriting Specialist.
Your tone is articulate, warm, financially astute, and direct. You have deep expertise in retail lending, credit scoring algorithms (CIBIL, FICO, Experian), debt-to-income (FOIR/DTI) ratios, EMI amortization, tax deductions, and personal wealth planning.
Always provide structured, actionable advice. Use markdown bolding, bullet points, and practical math calculations where helpful.`;

    if (context) {
      systemInstruction += `\n\nCurrent User Financial Context:
- Monthly Income: ${context.currency || '$'}${context.monthlyIncome || 'N/A'}
- Existing EMIs: ${context.currency || '$'}${context.existingEmis || '0'}
- Requested Loan: ${context.currency || '$'}${context.requestedLoan || 'N/A'} (${context.loanCategory || 'Personal/Home Loan'})
- Current FOIR/DTI: ${context.foir ? `${context.foir}%` : 'N/A'}
- Credit Score: ${context.creditScore || 'N/A'}
- Calculated Max Eligibility: ${context.currency || '$'}${context.maxEligibleLoan || 'N/A'}
When answering, reference these actual figures when relevant to give hyper-personalized advice.`;
    }

    // Prepare conversation contents
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I analyzed your request. Please ensure your debt obligations are manageable and credit utilization remains under 30%.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to generate financial advice',
      details: error.message,
    });
  }
});

// Endpoint: AI Loan Eligibility Underwriting Analysis
app.post('/api/loan-analysis', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const {
      monthlyIncome,
      existingEmis,
      requestedAmount,
      category,
      tenureYears,
      interestRate,
      creditScore,
      coApplicantIncome,
      employmentType,
      foir,
      maxEligibleLoan,
      currency = '$',
    } = data;

    if (!ai) {
      return res.json({
        summary: `Based on a FOIR of ${foir}% and income of ${currency}${monthlyIncome}, your profile is evaluated. A FOIR below 40% is ideal for prime rates.`,
        strategies: [
          'Consider clearing high-interest credit card dues to reduce monthly obligations.',
          'Increasing tenure from 5 to 7 years can lower your monthly EMI and bring your FOIR into the green zone.',
          'Adding a earning co-applicant can increase your maximum eligible loan amount significantly.',
        ],
        underwriterScore: foir <= 40 ? 88 : foir <= 50 ? 70 : 45,
        riskLevel: foir <= 40 ? 'Low Risk' : foir <= 50 ? 'Moderate Risk' : 'High Risk',
      });
    }

    const prompt = `As Ayush, a Senior BFSI Loan Underwriter, conduct a rigorous underwriting audit on this loan application:
- Monthly Net Income: ${currency}${monthlyIncome}
- Co-Applicant Income: ${currency}${coApplicantIncome || 0}
- Existing Monthly Obligations: ${currency}${existingEmis}
- Requested Loan Amount: ${currency}${requestedAmount}
- Loan Purpose / Category: ${category}
- Loan Tenure: ${tenureYears} years
- Interest Rate: ${interestRate}%
- Credit Score: ${creditScore}
- Employment Type: ${employmentType}
- Computed FOIR (Fixed Obligation to Income Ratio): ${foir}%
- Computed Max Eligible Loan: ${currency}${maxEligibleLoan}

Evaluate this profile and provide your response as a valid JSON object with the following keys:
{
  "summary": "2-3 sentence executive underwriter verdict on why the loan will or will not be approved easily",
  "approvalChance": number between 10 and 99 representing probability percentage,
  "riskLevel": "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Critical Risk",
  "strengths": ["list of 2-3 specific financial strengths observed in this profile"],
  "flags": ["list of 1-3 risk factors or warning flags for bank underwriting"],
  "strategies": ["list of 3-4 concrete actionable strategies to maximize approval, lower interest rate, or boost loan amount"],
  "recommendedAction": "immediate primary recommendation for the borrower"
}
Output strictly valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Loan analysis error:', error);
    res.status(500).json({ error: 'Failed to run underwriting analysis' });
  }
});

// Endpoint: AI Credit Score Doctor
app.post('/api/credit-advice', async (req: Request, res: Response) => {
  try {
    const { score, paymentHistory, utilization, creditAge, creditMix, inquiries } = req.body;

    if (!ai) {
      return res.json({
        diagnosis: `Your credit score is ${score}. Payment history and credit utilization (currently ${utilization}%) account for 65% of your total credit score weight.`,
        keyIssue: utilization > 30 ? 'High credit card utilization above recommended 30% ceiling' : 'Missed or late payments on record',
        thirtyDayAction: 'Pay down balances on credit cards before statement closing date to reflect under 30% utilization.',
        sixtyDayAction: 'Check your credit bureau report for inaccurate delinquency marks and file immediate disputes.',
        ninetyDayAction: 'Maintain uninterrupted 100% on-time payment track record and avoid applying for new credit cards.',
        projectedBoost: '+35 to +75 points',
      });
    }

    const prompt = `Act as Ayush, Certified Credit Repair & Credit Bureau Specialist. Analyze this borrower's credit profile:
- Overall Credit Score: ${score}
- Payment History Track Record: ${paymentHistory}
- Revolving Credit Utilization Ratio: ${utilization}%
- Credit History Age: ${creditAge}
- Credit Mix: ${creditMix}
- Hard Inquiries in Last 6 Months: ${inquiries}

Return a valid JSON object with:
{
  "diagnosis": "sharp 2-sentence breakdown of what is holding this credit score back and its standing",
  "keyIssue": "The single highest impact vulnerability hurting their score right now",
  "thirtyDayAction": "Specific tactical action for Days 1-30",
  "sixtyDayAction": "Specific tactical action for Days 31-60",
  "ninetyDayAction": "Specific tactical action for Days 61-90",
  "projectedBoost": "estimated score increase (e.g., '+40 to +80 points')",
  "proTips": ["2 quick pro-tips regarding credit limit hikes or bureau reporting cycles"]
}
Strictly output valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Credit advice error:', error);
    res.status(500).json({ error: 'Failed to generate credit advice' });
  }
});

// Endpoint: Dynamic Financial Tips & Strategies
app.post('/api/financial-tips', async (req: Request, res: Response) => {
  try {
    const { category, profile } = req.body;

    if (!ai) {
      return res.json({
        tips: [
          {
            title: 'The 30% Credit Utilization Golden Rule',
            description: 'Lenders view borrowers using over 30% of their credit limit as credit hungry. Keeping it under 20% maximizes your credit score tier.',
            tag: 'Credit Health',
          },
          {
            title: 'Prepayment Tenure Squeeze',
            description: 'Paying just 5% extra towards principal every quarter can shave up to 4 years off a 20-year home loan.',
            tag: 'EMI Optimization',
          },
          {
            title: 'FOIR Guardrail for Home Buyers',
            description: 'Never let combined EMIs exceed 50% of your net take-home salary, leaving room for unexpected lifestyle and inflation costs.',
            tag: 'Underwriting',
          },
        ],
      });
    }

    const prompt = `Generate 4 high-value, highly specific BFSI financial tips for category "${category || 'Smart Borrowing & Loan Optimization'}" tailored for an individual borrower with:
- Monthly Income: ${profile?.monthlyIncome || 'Moderate to High'}
- Existing Debt: ${profile?.existingEmis || 'Active loans'}
- Credit Standing: ${profile?.creditScore || '700+'}

Return a valid JSON object with:
{
  "tips": [
    {
      "title": "Short catchy title",
      "description": "2-3 sentences explaining the exact banking mechanism, math benefit, and implementation step",
      "tag": "e.g. Smart Borrowing | Tax Deduction | Debt Elimination | Wealth Shield"
    }
  ]
}
Output strictly valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Tips error:', error);
    res.status(500).json({ error: 'Failed to generate tips' });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`FinPulse AI server running on http://localhost:${PORT}`);
  });
}

startServer();
