/**
 * Dynamic Statistical Analyzer
 * Automatically detects data types and applies appropriate statistical tests
 */

export type DataType = 'continuous' | 'binary' | 'categorical';
export type TestType = 't-test' | 'z-test' | 'chi-squared';

export interface StatisticalInputs {
  groupA: number[];
  groupB: number[];
  significanceLevel: number;
  power: number;
  confidenceLevel: number;
}

export interface StatisticalResult {
  dataType: DataType;
  testType: TestType;
  testStatistic: number;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  effectSize: number;
  isSignificant: boolean;
  interpretation: {
    decision: 'reject' | 'fail_to_reject';
    plainLanguage: string;
    recommendation: string;
  };
  testDetails: {
    nullHypothesis: string;
    alternativeHypothesis: string;
    assumptions: string[];
    method: string;
  };
}

// Statistical utility functions
function mean(data: number[]): number {
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

function variance(data: number[]): number {
  const m = mean(data);
  return data.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (data.length - 1);
}

function standardDeviation(data: number[]): number {
  return Math.sqrt(variance(data));
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function tCDF(t: number, df: number): number {
  // Approximation for t-distribution CDF
  const x = t / Math.sqrt(df);
  return 0.5 + (x * (1 + x * x / (4 * df)) * Math.exp(-x * x / 2)) / Math.sqrt(2 * Math.PI);
}

function normalInverseCDF(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  
  const t = Math.sqrt(-2 * Math.log(p > 0.5 ? 1 - p : p));
  const z = t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
  
  return p > 0.5 ? z : -z;
}

// Data type detection
export function detectDataType(data: number[]): DataType {
  const uniqueValues = [...new Set(data)];
  
  // Check if binary (only 0s and 1s)
  if (uniqueValues.every(val => val === 0 || val === 1)) {
    return 'binary';
  }
  
  // Check if categorical (limited discrete values)
  if (uniqueValues.length <= 10 && uniqueValues.every(val => Number.isInteger(val))) {
    return 'categorical';
  }
  
  return 'continuous';
}

// Welch's t-test for continuous data
function welchTTest(groupA: number[], groupB: number[], alpha: number, confidenceLevel: number): StatisticalResult {
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const varA = variance(groupA);
  const varB = variance(groupB);
  const nA = groupA.length;
  const nB = groupB.length;
  
  // Welch's t-statistic
  const pooledSE = Math.sqrt(varA / nA + varB / nB);
  const t = (meanA - meanB) / pooledSE;
  
  // Welch-Satterthwaite degrees of freedom
  const df = Math.pow(varA / nA + varB / nB, 2) / 
             (Math.pow(varA / nA, 2) / (nA - 1) + Math.pow(varB / nB, 2) / (nB - 1));
  
  // P-value (two-tailed)
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  
  // Effect size (Cohen's d)
  const pooledSD = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));
  const cohensD = (meanA - meanB) / pooledSD;
  
  // Confidence interval for difference
  const tCritical = normalInverseCDF(1 - (1 - confidenceLevel) / 2); // Approximation
  const marginOfError = tCritical * pooledSE;
  const diff = meanA - meanB;
  
  const isSignificant = pValue < alpha;
  
  // Determine winner for continuous variables
  const winner = isSignificant ? (meanA > meanB ? 'Group A' : 'Group B') : null;
  
  return {
    dataType: 'continuous',
    testType: 't-test',
    testStatistic: t,
    pValue,
    confidenceInterval: {
      lower: diff - marginOfError,
      upper: diff + marginOfError
    },
    effectSize: cohensD,
    isSignificant,
    interpretation: {
      decision: isSignificant ? 'reject' : 'fail_to_reject',
      plainLanguage: isSignificant 
        ? `There is a statistically significant difference between the groups (p = ${pValue.toFixed(4)}). Group A mean (${meanA.toFixed(2)}) ${meanA > meanB ? 'is significantly higher than' : 'is significantly lower than'} Group B mean (${meanB.toFixed(2)}). Winner: ${winner}.`
        : `There is no statistically significant difference between the groups (p = ${pValue.toFixed(4)}). The difference between Group A mean (${meanA.toFixed(2)}) and Group B mean (${meanB.toFixed(2)}) could be due to random variation.`,
      recommendation: isSignificant
        ? `Reject the null hypothesis. ${winner} has a statistically significant advantage.`
        : 'Fail to reject the null hypothesis. Consider increasing sample size or the effect may not be meaningful.'
    },
    testDetails: {
      nullHypothesis: 'There is no difference in means between Group A and Group B',
      alternativeHypothesis: 'There is a difference in means between Group A and Group B',
      assumptions: ['Data is normally distributed', 'Observations are independent', 'Equal or unequal variances (Welch correction applied)'],
      method: "Welch's Two-Sample t-Test"
    }
  };
}

// Two-proportion z-test for binary data
function twoProportionZTest(groupA: number[], groupB: number[], alpha: number, confidenceLevel: number): StatisticalResult {
  const nA = groupA.length;
  const nB = groupB.length;
  const xA = groupA.reduce((sum, val) => sum + val, 0);
  const xB = groupB.reduce((sum, val) => sum + val, 0);
  
  const pA = xA / nA;
  const pB = xB / nB;
  const pPool = (xA + xB) / (nA + nB);
  
  // Z-statistic
  const standardError = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
  const z = (pA - pB) / standardError;
  
  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // Confidence interval for difference
  const zCritical = normalInverseCDF(1 - (1 - confidenceLevel) / 2);
  const seDiff = Math.sqrt((pA * (1 - pA) / nA) + (pB * (1 - pB) / nB));
  const diff = pA - pB;
  const marginOfError = zCritical * seDiff;
  
  const isSignificant = pValue < alpha;
  
  return {
    dataType: 'binary',
    testType: 'z-test',
    testStatistic: z,
    pValue,
    confidenceInterval: {
      lower: diff - marginOfError,
      upper: diff + marginOfError
    },
    effectSize: diff, // Difference in proportions
    isSignificant,
    interpretation: {
      decision: isSignificant ? 'reject' : 'fail_to_reject',
      plainLanguage: isSignificant 
        ? `There is a statistically significant difference in proportions between the groups (p = ${pValue.toFixed(4)}). Group A proportion (${(pA * 100).toFixed(1)}%) differs significantly from Group B proportion (${(pB * 100).toFixed(1)}%).`
        : `There is no statistically significant difference in proportions between the groups (p = ${pValue.toFixed(4)}). The difference between Group A (${(pA * 100).toFixed(1)}%) and Group B (${(pB * 100).toFixed(1)}%) could be due to random variation.`,
      recommendation: isSignificant
        ? 'Reject the null hypothesis. The difference in proportions is statistically significant.'
        : 'Fail to reject the null hypothesis. Consider increasing sample size or the effect may not be meaningful.'
    },
    testDetails: {
      nullHypothesis: 'There is no difference in proportions between Group A and Group B',
      alternativeHypothesis: 'There is a difference in proportions between Group A and Group B',
      assumptions: ['Binary outcomes (0/1)', 'Independent observations', 'Large sample size (np ≥ 5 and n(1-p) ≥ 5)'],
      method: 'Two-Proportion Z-Test'
    }
  };
}

// Chi-squared test for categorical data
function chiSquaredTest(groupA: number[], groupB: number[], alpha: number, confidenceLevel: number): StatisticalResult {
  // Create contingency table
  const uniqueValues = [...new Set([...groupA, ...groupB])].sort();
  const contingencyTable: number[][] = [];
  
  // Count frequencies
  for (const value of uniqueValues) {
    const countA = groupA.filter(x => x === value).length;
    const countB = groupB.filter(x => x === value).length;
    contingencyTable.push([countA, countB]);
  }
  
  const totalA = groupA.length;
  const totalB = groupB.length;
  const grandTotal = totalA + totalB;
  
  // Calculate chi-squared statistic
  let chiSquared = 0;
  let effectSize = 0; // Cramér's V
  
  for (let i = 0; i < contingencyTable.length; i++) {
    const observedA = contingencyTable[i][0];
    const observedB = contingencyTable[i][1];
    const rowTotal = observedA + observedB;
    
    const expectedA = (rowTotal * totalA) / grandTotal;
    const expectedB = (rowTotal * totalB) / grandTotal;
    
    if (expectedA > 0) chiSquared += Math.pow(observedA - expectedA, 2) / expectedA;
    if (expectedB > 0) chiSquared += Math.pow(observedB - expectedB, 2) / expectedB;
  }
  
  const df = uniqueValues.length - 1;
  effectSize = Math.sqrt(chiSquared / grandTotal); // Cramér's V
  
  // Approximate p-value (simplified)
  const pValue = Math.exp(-chiSquared / 2) * Math.pow(chiSquared / 2, df / 2) / factorial(df / 2);
  
  const isSignificant = pValue < alpha;
  
  return {
    dataType: 'categorical',
    testType: 'chi-squared',
    testStatistic: chiSquared,
    pValue: Math.min(pValue, 1), // Cap at 1
    confidenceInterval: {
      lower: 0,
      upper: effectSize * 2 // Rough estimate
    },
    effectSize,
    isSignificant,
    interpretation: {
      decision: isSignificant ? 'reject' : 'fail_to_reject',
      plainLanguage: isSignificant 
        ? `There is a statistically significant association between group membership and the categorical variable (p = ${pValue.toFixed(4)}). The distribution differs significantly between groups.`
        : `There is no statistically significant association between group membership and the categorical variable (p = ${pValue.toFixed(4)}). The distributions are similar between groups.`,
      recommendation: isSignificant
        ? 'Reject the null hypothesis. There is a significant association between variables.'
        : 'Fail to reject the null hypothesis. No significant association detected.'
    },
    testDetails: {
      nullHypothesis: 'There is no association between group membership and the categorical variable',
      alternativeHypothesis: 'There is an association between group membership and the categorical variable',
      assumptions: ['Independent observations', 'Expected frequencies ≥ 5 in each cell', 'Categorical data'],
      method: 'Chi-Squared Test of Independence'
    }
  };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Main analysis function
export function analyzeData(inputs: StatisticalInputs): StatisticalResult {
  const { groupA, groupB, significanceLevel, confidenceLevel } = inputs;
  
  // Detect data type based on both groups
  const dataTypeA = detectDataType(groupA);
  const dataTypeB = detectDataType(groupB);
  
  // Use the more restrictive data type
  let dataType: DataType = 'continuous';
  if (dataTypeA === 'binary' || dataTypeB === 'binary') {
    dataType = 'binary';
  } else if (dataTypeA === 'categorical' || dataTypeB === 'categorical') {
    dataType = 'categorical';
  }
  
  // Apply appropriate test
  switch (dataType) {
    case 'binary':
      return twoProportionZTest(groupA, groupB, significanceLevel, confidenceLevel);
    case 'categorical':
      return chiSquaredTest(groupA, groupB, significanceLevel, confidenceLevel);
    case 'continuous':
    default:
      return welchTTest(groupA, groupB, significanceLevel, confidenceLevel);
  }
}

// Enhanced function to handle both categorical and continuous data formats
export function convertABTestDataToAnalyzerFormat(
  groupAData: { conversions: number; totalUsers: number; continuousValues?: number[] },
  groupBData: { conversions: number; totalUsers: number; continuousValues?: number[] }
): { groupA: number[]; groupB: number[] } {
  // If continuous values are provided, use them directly
  if (groupAData.continuousValues && groupBData.continuousValues) {
    return { 
      groupA: groupAData.continuousValues, 
      groupB: groupBData.continuousValues 
    };
  }

  // Convert to binary arrays (0 = no conversion, 1 = conversion)
  const groupA: number[] = [
    ...Array(groupAData.conversions).fill(1),
    ...Array(groupAData.totalUsers - groupAData.conversions).fill(0)
  ];
  
  const groupB: number[] = [
    ...Array(groupBData.conversions).fill(1),
    ...Array(groupBData.totalUsers - groupBData.conversions).fill(0)
  ];
  
  return { groupA, groupB };
}

// Calculate continuous metrics (mean, std dev, etc.) for each group
export function calculateContinuousMetrics(data: number[]): {
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
  median: number;
  count: number;
} {
  if (data.length === 0) {
    return { mean: 0, standardDeviation: 0, min: 0, max: 0, median: 0, count: 0 };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const meanValue = mean(data);
  const stdDev = standardDeviation(data);
  
  return {
    mean: meanValue,
    standardDeviation: stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)],
    count: data.length
  };
}

// Enhanced analysis function that handles both conversion rates and continuous values
export function analyzeDynamicABTest(inputs: StatisticalInputs): StatisticalResult & {
  continuousMetrics?: {
    groupA: ReturnType<typeof calculateContinuousMetrics>;
    groupB: ReturnType<typeof calculateContinuousMetrics>;
  };
} {
  const baseResult = analyzeData(inputs);
  
  // If data is continuous, also calculate continuous metrics
  if (baseResult.dataType === 'continuous') {
    const continuousMetrics = {
      groupA: calculateContinuousMetrics(inputs.groupA),
      groupB: calculateContinuousMetrics(inputs.groupB)
    };
    
    return {
      ...baseResult,
      continuousMetrics
    };
  }
  
  return baseResult;
}

// Dynamic check for conversion rates and continuous values post statistical test
export function performDynamicCheck(
  variants: Array<{ name: string; visitors: number; conversions: number; conversionRate: number; continuousValues?: number[] }>,
  params: { significanceLevel: number; power: number; confidenceLevel: number }
): StatisticalResult & { continuousMetrics?: any } {
  if (variants.length < 2) {
    throw new Error('Need at least 2 variants for comparison');
  }

  const control = variants[0];
  const variant = variants[1];

  // Check if we have continuous values
  const hasContinuousValues = control.continuousValues && variant.continuousValues;

  const { groupA, groupB } = convertABTestDataToAnalyzerFormat(
    { 
      conversions: control.conversions, 
      totalUsers: control.visitors, 
      continuousValues: control.continuousValues 
    },
    { 
      conversions: variant.conversions, 
      totalUsers: variant.visitors, 
      continuousValues: variant.continuousValues 
    }
  );

  return analyzeDynamicABTest({
    groupA,
    groupB,
    significanceLevel: params.significanceLevel,
    power: params.power,
    confidenceLevel: params.confidenceLevel
  });
}