import { StatisticalAnalysis, VariantResult } from '@/types';

// Calculate sample size for two-proportion z-test
export function calculateSampleSize(
  p1: number, // Control conversion rate
  p2: number, // Variant conversion rate  
  alpha: number = 0.05, // Significance level
  beta: number = 0.20, // Type II error (power = 1 - beta = 0.80)
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): number {
  const zAlpha = tailType === 'two-tailed' ? 1.96 : 1.645; // Critical value for alpha
  const zBeta = 0.842; // Critical value for beta (80% power)
  
  const pooledP = (p1 + p2) / 2;
  const effect = Math.abs(p2 - p1);
  
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(effect, 2);
  
  return Math.ceil(numerator / denominator);
}

// Calculate estimated test duration
export function calculateTestDuration(sampleSize: number, trafficPerDay: number): number {
  return Math.ceil((sampleSize * 2) / trafficPerDay); // *2 for both control and variant
}

// Perform two-proportion z-test
export function twoProportionZTest(
  x1: number, // Control conversions
  n1: number, // Control sample size
  x2: number, // Variant conversions
  n2: number, // Variant sample size
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): StatisticalAnalysis {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  
  // Calculate z-score
  const standardError = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
  const zScore = (p2 - p1) / standardError;
  
  // Calculate p-value
  const pValue = tailType === 'two-tailed' 
    ? 2 * (1 - normalCDF(Math.abs(zScore)))
    : 1 - normalCDF(zScore);
  
  // Calculate confidence interval for difference
  const seDiff = Math.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2));
  const marginOfError = 1.96 * seDiff; // 95% confidence
  const diff = p2 - p1;
  
  const confidenceInterval = {
    lower: diff - marginOfError,
    upper: diff + marginOfError
  };
  
  // Calculate uplift
  const uplift = ((p2 - p1) / p1) * 100;
  
  return {
    sampleSize: n1 + n2,
    pValue,
    confidenceInterval,
    uplift,
    isSignificant: pValue < 0.05
  };
}

// Normal CDF approximation
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  return x > 0 ? 1 - probability : probability;
}

// Calculate confidence interval for a proportion
export function calculateConfidenceInterval(
  conversions: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  const p = conversions / sampleSize;
  const z = confidenceLevel === 0.95 ? 1.96 : 1.645;
  const standardError = Math.sqrt((p * (1 - p)) / sampleSize);
  const marginOfError = z * standardError;
  
  return {
    lower: Math.max(0, p - marginOfError),
    upper: Math.min(1, p + marginOfError)
  };
}

// Analyze A/B test data
export function analyzeTestData(
  data: any[][],
  variantColumn: number,
  conversionColumn: number
): { variants: VariantResult[]; analysis: StatisticalAnalysis | null } {
  // Group data by variant
  const variantGroups: { [key: string]: any[] } = {};
  
  data.forEach(row => {
    const variant = row[variantColumn];
    if (!variantGroups[variant]) {
      variantGroups[variant] = [];
    }
    variantGroups[variant].push(row);
  });
  
  // Calculate metrics for each variant
  const variants: VariantResult[] = Object.entries(variantGroups).map(([name, rows]) => {
    const visitors = rows.length;
    const conversions = rows.filter(row => {
      const conversionValue = row[conversionColumn];
      return conversionValue === 'Yes' || conversionValue === '1' || conversionValue === 1 || conversionValue === true;
    }).length;
    
    const conversionRate = visitors > 0 ? conversions / visitors : 0;
    const confidenceInterval = calculateConfidenceInterval(conversions, visitors);
    
    return {
      name,
      visitors,
      conversions,
      conversionRate,
      confidenceInterval
    };
  });
  
  // Perform statistical analysis if we have control and at least one variant
  let analysis: StatisticalAnalysis | null = null;
  const control = variants.find(v => v.name.toLowerCase().includes('control'));
  const variant = variants.find(v => !v.name.toLowerCase().includes('control'));
  
  if (control && variant) {
    analysis = twoProportionZTest(
      control.conversions,
      control.visitors,
      variant.conversions,
      variant.visitors
    );
  }
  
  return { variants, analysis };
}