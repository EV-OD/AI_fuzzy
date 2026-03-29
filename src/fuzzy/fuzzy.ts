export type FuzzySet = Record<string, number>;

// Trapezoidal membership function
export function trapezoidal(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

// Triangular membership function
export function triangular(x: number, a: number, b: number, c: number): number {
  return trapezoidal(x, a, b, b, c);
}

export function fuzzifyCreditScore(score: number | null): FuzzySet {
  if (score === null) return { Unknown: 1 };
  return {
    Poor: trapezoidal(score, 0, 0, 550, 600),
    Fair: trapezoidal(score, 550, 600, 650, 700),
    Good: trapezoidal(score, 650, 700, 730, 760),
    Excellent: trapezoidal(score, 730, 760, 850, 850)
  };
}

export function fuzzifyDTI(dti: number | null): FuzzySet {
  if (dti === null) return { Unknown: 1 };
  return {
    Low: trapezoidal(dti, 0, 0, 15, 25),
    Moderate: trapezoidal(dti, 15, 25, 35, 45),
    High: trapezoidal(dti, 35, 45, 100, 100)
  };
}

export function fuzzifyIncome(income: number | null): FuzzySet {
  if (income === null) return { Unknown: 1 };
  return {
    Struggling: trapezoidal(income, 0, 0, 25000, 40000),
    Middle: trapezoidal(income, 25000, 40000, 80000, 120000),
    High: trapezoidal(income, 80000, 120000, 1000000, 1000000)
  };
}

export function fuzzifyEmployment(years: number | null): FuzzySet {
  if (years === null) return { Unknown: 1 };
  return {
    Unstable: trapezoidal(years, 0, 0, 1, 2),
    Stable: trapezoidal(years, 1, 2, 4, 6),
    "Long-term": trapezoidal(years, 4, 6, 50, 50)
  };
}

export function fuzzifyLTV(ltv: number | null): FuzzySet {
  if (ltv === null) return { Unknown: 1 };
  return {
    Conservative: trapezoidal(ltv, 0, 0, 70, 85),
    Risky: trapezoidal(ltv, 70, 85, 100, 100)
  };
}

export function fuzzifySavings(savings: number | null): FuzzySet {
  if (savings === null) return { Unknown: 1 };
  return {
    Low: trapezoidal(savings, 0, 0, 2000, 5000),
    Sufficient: trapezoidal(savings, 2000, 5000, 15000, 25000),
    Surplus: trapezoidal(savings, 15000, 25000, 1000000, 1000000)
  };
}

export function fuzzifyDefaults(defaults: number | null): FuzzySet {
  if (defaults === null) return { Unknown: 1 };
  return {
    None: defaults === 0 ? 1 : 0,
    Minor: defaults === 1 ? 1 : 0,
    Major: defaults > 1 ? 1 : 0
  };
}

export function fuzzifyCollateral(quality: string | null): FuzzySet {
  if (quality === null || quality === "Unknown") return { Unknown: 1 };
  return {
    Depreciating: quality === "Depreciating" ? 1 : 0,
    Stable: quality === "Stable" ? 1 : 0,
    Appreciating: quality === "Appreciating" ? 1 : 0
  };
}

export function fuzzifyAge(age: number | null): FuzzySet {
  if (age === null) return { Unknown: 1 };
  return {
    Student: trapezoidal(age, 18, 18, 22, 26),
    Professional: trapezoidal(age, 22, 26, 55, 65),
    Senior: trapezoidal(age, 55, 65, 100, 100)
  };
}

export function fuzzifyExistingLoans(loans: number | null): FuzzySet {
  if (loans === null) return { Unknown: 1 };
  return {
    None: loans === 0 ? 1 : 0,
    Moderate: loans >= 1 && loans <= 2 ? 1 : 0,
    High: loans > 2 ? 1 : 0
  };
}

export interface CrispInput {
  creditScore: number | null;
  dti: number | null;
  income: number | null;
  employment: number | null;
  ltv: number | null;
  savings: number | null;
  defaults: number | null;
  collateral: string | null;
  age: number | null;
  existingLoans: number | null;
}

export function fuzzifyAll(input: CrispInput): Record<string, FuzzySet> {
  return {
    "Credit Score": fuzzifyCreditScore(input.creditScore),
    "DTI Ratio": fuzzifyDTI(input.dti),
    "Annual Income": fuzzifyIncome(input.income),
    "Employment History": fuzzifyEmployment(input.employment),
    "LTV Ratio": fuzzifyLTV(input.ltv),
    "Savings Liquidity": fuzzifySavings(input.savings),
    "Previous Defaults": fuzzifyDefaults(input.defaults),
    "Collateral Quality": fuzzifyCollateral(input.collateral),
    "Age/Demographic": fuzzifyAge(input.age),
    "Existing Loan Count": fuzzifyExistingLoans(input.existingLoans)
  };
}

export function defuzzify(probabilities: Record<string, number>): { decision: string, likelihood: number } {
  const approved = probabilities["Approved"] || 0;
  const rejected = probabilities["Rejected"] || 0;
  
  const total = approved + rejected;
  if (total === 0) return { decision: "Unknown", likelihood: 0 };
  
  const likelihood = approved / total;
  return {
    decision: likelihood >= 0.5 ? "Approved" : "Rejected",
    likelihood: likelihood * 100
  };
}
