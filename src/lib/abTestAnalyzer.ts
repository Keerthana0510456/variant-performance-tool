/**
 * A/B Test Statistical Analysis
 * Based on proper statistical methods for comparing conversion rates
 */

export interface ABTestData {
  variant: string;
  visitors: number;
  conversions: number;
  conversion_rate: number;
  uplift: number;
  p_value: number;
}

export interface ABTestResults {
  results: ABTestData[];
  control: ABTestData;
  hasSignificantResult: boolean;
  winner?: ABTestData;
}

// New interface for the detailed A/B test analyzer
export interface ABTestInputs {
  groupA: {
    conversions: number;
    totalUsers: number;
  };
  groupB: {
    conversions: number;
    totalUsers: number;
  };
  significanceLevel: number; // α (e.g., 0.05)
  statisticalPower: number; // 1-β (e.g., 0.8)
}

export interface DetailedABTestResults {
  pValue: number;
  requiredSampleSize: number;
  currentSampleSizeSufficient: boolean;
  isSignificant: boolean;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  groupARate: number;
  groupBRate: number;
  effectSize: number;
  currentSampleSize: number;
}

/**
 * Normal CDF approximation for calculating p-values
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
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

/**
 * Calculate A/B test analysis from CSV data
 */
export function calculateABTest(data: any[][], variantColumnIndex: number, visitorsColumnIndex: number, conversionsColumnIndex: number): ABTestResults {
  // Skip header row and process data
  const dataRows = data.slice(1);
  
  // Group data by variant
  const variantGroups: { [key: string]: { visitors: number; conversions: number } } = {};
  
  dataRows.forEach(row => {
    const variant = row[variantColumnIndex];
    const visitors = parseInt(row[visitorsColumnIndex]) || 0;
    const conversions = parseInt(row[conversionsColumnIndex]) || 0;
    
    if (!variantGroups[variant]) {
      variantGroups[variant] = { visitors: 0, conversions: 0 };
    }
    
    variantGroups[variant].visitors += visitors;
    variantGroups[variant].conversions += conversions;
  });

  // Find control group
  const controlKey = Object.keys(variantGroups).find(key => 
    key.toLowerCase().includes('control') || key.toLowerCase() === 'a'
  );
  
  if (!controlKey) {
    throw new Error("No Control group found in the dataset.");
  }

  const controlData = variantGroups[controlKey];
  if (controlData.visitors === 0) {
    throw new Error("Control group visitors cannot be zero.");
  }

  const controlRate = controlData.conversions / controlData.visitors;
  const results: ABTestData[] = [];

  // Calculate control data
  const control: ABTestData = {
    variant: controlKey,
    visitors: controlData.visitors,
    conversions: controlData.conversions,
    conversion_rate: parseFloat((controlRate * 100).toFixed(2)),
    uplift: 0,
    p_value: 1.0
  };

  // Calculate results for each variant
  Object.entries(variantGroups).forEach(([variantName, variantData]) => {
    if (variantName === controlKey || variantData.visitors === 0) {
      return;
    }

    const variantRate = variantData.conversions / variantData.visitors;
    const uplift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;

    // Calculate pooled proportion for statistical test
    const pooledP = (controlData.conversions + variantData.conversions) / 
                   (controlData.visitors + variantData.visitors);
    
    // Calculate standard error
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * 
                                   (1 / controlData.visitors + 1 / variantData.visitors));
    
    // Calculate z-score
    const zScore = standardError > 0 ? (controlRate - variantRate) / standardError : 0;
    
    // Calculate two-tailed p-value
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

    results.push({
      variant: variantName,
      visitors: variantData.visitors,
      conversions: variantData.conversions,
      conversion_rate: parseFloat((variantRate * 100).toFixed(2)),
      uplift: parseFloat(uplift.toFixed(2)),
      p_value: parseFloat(pValue.toFixed(4))
    });
  });

  // Determine if there's a significant result and winner
  const hasSignificantResult = results.some(result => result.p_value < 0.05);
  const winner = results.reduce((prev, current) => 
    current.conversion_rate > prev.conversion_rate ? current : prev
  );

  return {
    results,
    control,
    hasSignificantResult,
    winner: hasSignificantResult ? winner : undefined
  };
}

/**
 * Analyze A/B test data from uploaded CSV format
 * Expects columns: Variant, Visitors, Conversions (or similar mapped columns)
 */
export function analyzeABTestFromUpload(
  data: any[][],
  variantColumn: string,
  conversionColumn: string,
  columns: string[]
): ABTestResults {
  const variantColumnIndex = columns.indexOf(variantColumn);
  const conversionColumnIndex = columns.indexOf(conversionColumn);
  
  if (variantColumnIndex === -1 || conversionColumnIndex === -1) {
    throw new Error("Required columns not found in data");
  }

  // Check if data has aggregated format (Variant, Visitors, Conversions)
  const visitorsColumnIndex = columns.findIndex(col => 
    col.toLowerCase().includes('visitor') || col.toLowerCase().includes('sample')
  );

  if (visitorsColumnIndex !== -1) {
    // Data is already aggregated
    return calculateABTest(data, variantColumnIndex, visitorsColumnIndex, conversionColumnIndex);
  } else {
    // Data is row-level, need to aggregate first
    return aggregateAndAnalyze(data, variantColumnIndex, conversionColumnIndex);
  }
}

/**
 * Aggregate row-level data and analyze
 */
function aggregateAndAnalyze(
  data: any[][],
  variantColumnIndex: number,
  conversionColumnIndex: number
): ABTestResults {
  const dataRows = data.slice(1); // Skip header
  
  // Aggregate data by variant
  const variantGroups: { [key: string]: { visitors: number; conversions: number } } = {};
  
  dataRows.forEach(row => {
    const variant = row[variantColumnIndex];
    const conversionValue = row[conversionColumnIndex];
    
    // Determine if this row represents a conversion
    const isConverted = conversionValue === 'Yes' || 
                       conversionValue === '1' || 
                       conversionValue === 1 || 
                       conversionValue === true ||
                       conversionValue === 'TRUE' ||
                       conversionValue === 'true';
    
    if (!variantGroups[variant]) {
      variantGroups[variant] = { visitors: 0, conversions: 0 };
    }
    
    variantGroups[variant].visitors += 1;
    if (isConverted) {
      variantGroups[variant].conversions += 1;
    }
  });

  // Convert to array format for analysis
  const aggregatedData = [
    ['Variant', 'Visitors', 'Conversions'], // Header
    ...Object.entries(variantGroups).map(([variant, data]) => [
      variant, data.visitors.toString(), data.conversions.toString()
    ])
  ];

  return calculateABTest(aggregatedData, 0, 1, 2);
}

// Inverse normal CDF approximation for z-values
function normalInverseCDF(p: number): number {
  if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1');
  
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

/**
 * Detailed A/B Testing Analyzer
 * Takes specific inputs and returns comprehensive statistical results
 */
export function analyzeABTest(inputs: ABTestInputs): DetailedABTestResults {
  const { groupA, groupB, significanceLevel, statisticalPower } = inputs;
  
  // Calculate conversion rates
  const pA = groupA.conversions / groupA.totalUsers;
  const pB = groupB.conversions / groupB.totalUsers;
  
  // Calculate pooled proportion for z-test
  const pooledP = (groupA.conversions + groupB.conversions) / (groupA.totalUsers + groupB.totalUsers);
  
  // Calculate standard error for z-test
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/groupA.totalUsers + 1/groupB.totalUsers));
  
  // Calculate z-score
  const zScore = Math.abs(pB - pA) / standardError;
  
  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  
  // Check if significant
  const isSignificant = pValue < significanceLevel;
  
  // Calculate confidence interval for difference (pB - pA)
  const zAlpha = normalInverseCDF(1 - significanceLevel/2); // Critical value for confidence interval
  const seDiff = Math.sqrt((pA * (1 - pA) / groupA.totalUsers) + (pB * (1 - pB) / groupB.totalUsers));
  const diff = pB - pA;
  const marginOfError = zAlpha * seDiff;
  
  const confidenceInterval = {
    lower: diff - marginOfError,
    upper: diff + marginOfError
  };
  
  // Calculate required sample size per group
  const zBeta = normalInverseCDF(statisticalPower); // Critical value for power
  const zAlphaForSample = normalInverseCDF(1 - significanceLevel/2);
  
  const avgP = (pA + pB) / 2;
  const effectSize = Math.abs(pB - pA);
  
  let requiredSampleSize: number;
  if (effectSize > 0) {
    const numerator = Math.pow(
      zAlphaForSample * Math.sqrt(2 * avgP * (1 - avgP)) + 
      zBeta * Math.sqrt(pA * (1 - pA) + pB * (1 - pB)), 
      2
    );
    const denominator = Math.pow(effectSize, 2);
    requiredSampleSize = Math.ceil(numerator / denominator);
  } else {
    requiredSampleSize = Infinity; // No effect, infinite sample needed
  }
  
  // Check if current sample size is sufficient
  const currentSampleSize = Math.min(groupA.totalUsers, groupB.totalUsers);
  const currentSampleSizeSufficient = currentSampleSize >= requiredSampleSize;
  
  return {
    pValue: Number(pValue.toFixed(6)),
    requiredSampleSize: isFinite(requiredSampleSize) ? requiredSampleSize : 0,
    currentSampleSizeSufficient,
    isSignificant,
    confidenceInterval: {
      lower: Number(confidenceInterval.lower.toFixed(6)),
      upper: Number(confidenceInterval.upper.toFixed(6))
    },
    groupARate: Number(pA.toFixed(6)),
    groupBRate: Number(pB.toFixed(6)),
    effectSize: Number(effectSize.toFixed(6)),
    currentSampleSize
  };
}

/**
 * Format A/B test results for display
 */
export function formatABTestResults(results: DetailedABTestResults): string {
  const { 
    pValue, 
    requiredSampleSize, 
    currentSampleSizeSufficient, 
    isSignificant, 
    confidenceInterval,
    groupARate,
    groupBRate,
    effectSize,
    currentSampleSize
  } = results;
  
  return `
A/B Test Analysis Results:
========================
Group A Conversion Rate: ${(groupARate * 100).toFixed(2)}%
Group B Conversion Rate: ${(groupBRate * 100).toFixed(2)}%
Effect Size: ${(effectSize * 100).toFixed(2)} percentage points

Statistical Significance:
- p-value: ${pValue}
- Is Significant: ${isSignificant ? 'YES' : 'NO'}

Sample Size Analysis:
- Current Sample Size: ${currentSampleSize} per group
- Required Sample Size: ${requiredSampleSize} per group
- Sample Size Sufficient: ${currentSampleSizeSufficient ? 'YES' : 'NO'}

Confidence Interval (95%):
- Lower Bound: ${(confidenceInterval.lower * 100).toFixed(2)} percentage points
- Upper Bound: ${(confidenceInterval.upper * 100).toFixed(2)} percentage points
  `;
}