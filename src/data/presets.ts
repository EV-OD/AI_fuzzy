import { DataRow } from "../core/id3";
import { CrispInput } from "../fuzzy/fuzzy";

export const PRESETS: Record<string, CrispInput> = {
  "Ideal Candidate": {
    creditScore: 800,
    dti: 10,
    income: 150000,
    employment: 10,
    ltv: 60,
    savings: 50000,
    defaults: 0,
    collateral: "Appreciating",
    age: 35,
    existingLoans: 0
  },
  "High Risk": {
    creditScore: 550,
    dti: 50,
    income: 25000,
    employment: 0.5,
    ltv: 95,
    savings: 1000,
    defaults: 3,
    collateral: "Depreciating",
    age: 20,
    existingLoans: 4
  },
  "Incomplete Profile": {
    creditScore: null,
    dti: 30,
    income: null,
    employment: 3,
    ltv: 80,
    savings: 10000,
    defaults: 0,
    collateral: "Stable",
    age: 28,
    existingLoans: 1
  },
  "Young Professional": {
    creditScore: 720,
    dti: 25,
    income: 85000,
    employment: 2,
    ltv: 90,
    savings: 15000,
    defaults: 0,
    collateral: "Stable",
    age: 25,
    existingLoans: 1
  },
  "Struggling Entrepreneur": {
    creditScore: 620,
    dti: 45,
    income: 45000,
    employment: 1,
    ltv: 85,
    savings: 5000,
    defaults: 1,
    collateral: "Depreciating",
    age: 32,
    existingLoans: 3
  },
  "Wealthy Retiree": {
    creditScore: 820,
    dti: 5,
    income: 60000,
    employment: 0,
    ltv: 40,
    savings: 250000,
    defaults: 0,
    collateral: "Appreciating",
    age: 70,
    existingLoans: 0
  },
  "Average Citizen": {
    creditScore: 680,
    dti: 35,
    income: 65000,
    employment: 5,
    ltv: 80,
    savings: 12000,
    defaults: 0,
    collateral: "Stable",
    age: 40,
    existingLoans: 2
  }
};

export const ATTRIBUTES = [
  "Credit Score",
  "DTI Ratio",
  "Annual Income",
  "Employment History",
  "LTV Ratio",
  "Savings Liquidity",
  "Previous Defaults",
  "Collateral Quality",
  "Age/Demographic",
  "Existing Loan Count"
];

// Generate synthetic training data
export function generateTrainingData(count: number = 200): DataRow[] {
  const data: DataRow[] = [];
  
  const creditScores = ["Poor", "Fair", "Good", "Excellent"];
  const dtis = ["Low", "Moderate", "High"];
  const incomes = ["Struggling", "Middle", "High"];
  const employments = ["Unstable", "Stable", "Long-term"];
  const ltvs = ["Conservative", "Risky"];
  const savings = ["Low", "Sufficient", "Surplus"];
  const defaults = ["None", "Minor", "Major"];
  const collaterals = ["Depreciating", "Stable", "Appreciating"];
  const ages = ["Student", "Professional", "Senior"];
  const loans = ["None", "Moderate", "High"];

  for (let i = 0; i < count; i++) {
    const row: DataRow = {
      "Credit Score": creditScores[Math.floor(Math.random() * creditScores.length)],
      "DTI Ratio": dtis[Math.floor(Math.random() * dtis.length)],
      "Annual Income": incomes[Math.floor(Math.random() * incomes.length)],
      "Employment History": employments[Math.floor(Math.random() * employments.length)],
      "LTV Ratio": ltvs[Math.floor(Math.random() * ltvs.length)],
      "Savings Liquidity": savings[Math.floor(Math.random() * savings.length)],
      "Previous Defaults": defaults[Math.floor(Math.random() * defaults.length)],
      "Collateral Quality": collaterals[Math.floor(Math.random() * collaterals.length)],
      "Age/Demographic": ages[Math.floor(Math.random() * ages.length)],
      "Existing Loan Count": loans[Math.floor(Math.random() * loans.length)]
    };

    // Simple rules to determine approval
    let score = 0;
    if (row["Credit Score"] === "Excellent") score += 3;
    if (row["Credit Score"] === "Good") score += 1;
    if (row["Credit Score"] === "Poor") score -= 3;
    
    if (row["Previous Defaults"] === "None") score += 1;
    if (row["Previous Defaults"] === "Major") score -= 4;
    
    if (row["DTI Ratio"] === "Low") score += 2;
    if (row["DTI Ratio"] === "High") score -= 2;
    
    if (row["Annual Income"] === "High") score += 2;
    if (row["Annual Income"] === "Struggling") score -= 2;
    
    if (row["Savings Liquidity"] === "Surplus") score += 1;
    if (row["Savings Liquidity"] === "Low") score -= 1;

    if (row["Employment History"] === "Long-term") score += 1;
    if (row["Employment History"] === "Unstable") score -= 1;

    if (row["LTV Ratio"] === "Conservative") score += 1;
    if (row["LTV Ratio"] === "Risky") score -= 1;

    // Add some randomness
    score += (Math.random() * 2 - 1);

    row["Approved"] = score > 0 ? "Approved" : "Rejected";
    data.push(row);
  }
  
  return data;
}
