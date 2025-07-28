import { StatisticalAnalysis, VariantResult } from '@/types';
import { analyzeABTestFromUpload } from './abTestAnalyzer';

// Calculate sample size for two-proportion z-test
export function calculateSampleSize(
  p1: number, // Control conversion rate
  p2: number, // Variant conversion rate  
  alpha: number = 0.05, // Significance level
  beta: number = 0.20, // Type II error (power = 1 - beta = 0.80)
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): number {
  // Calculate critical values based on actual alpha and beta values
  const zAlpha = tailType === 'two-tailed' 
    ? normalInverseCDF(1 - alpha/2)  // Two-tailed test
    : normalInverseCDF(1 - alpha);   // One-tailed test
  const zBeta = normalInverseCDF(1 - beta); // Critical value for beta
  
  const pooledP = (p1 + p2) / 2;
  const effect = Math.abs(p2 - p1);
  
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(effect, 2);
  
  return Math.ceil(numerator / denominator);
}

// Normal inverse CDF approximation for critical values
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

// Analyze A/B test data using the new analyzer
export async function analyzeTestData(
  data: any[][],
  variantColumn: number,
  conversionColumn: number,
  columns: string[],
  statisticalParams?: { 
    significanceLevel?: number; 
    power?: number; 
    confidenceLevel?: number;
  }
): Promise<{ variants: VariantResult[]; analysis: StatisticalAnalysis | null }> {
  try {
    const variantColumnName = columns[variantColumn];
    const conversionColumnName = columns[conversionColumn];
    
    // First check if we have continuous data (non-binary values in conversion column)
    const conversionValues = data.slice(1).map(row => row[conversionColumn]).filter(val => val !== null && val !== undefined);
    const isContinuous = conversionValues.some(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num !== 0 && num !== 1;
    });
    
    if (isContinuous) {
      // Handle continuous data
      const variantGroups: { [key: string]: number[] } = {};
      
      data.slice(1).forEach(row => {
        const variant = row[variantColumn];
        const value = parseFloat(row[conversionColumn]);
        
        if (!isNaN(value)) {
          if (!variantGroups[variant]) {
            variantGroups[variant] = [];
          }
          variantGroups[variant].push(value);
        }
      });
      
      const variantNames = Object.keys(variantGroups);
      if (variantNames.length < 2) {
        throw new Error('Need at least 2 variants for comparison');
      }
      
      // Prepare variants data
      const variants: VariantResult[] = variantNames.map(name => ({
        name,
        visitors: variantGroups[name].length,
        conversions: 0, // Not applicable for continuous data
        conversionRate: 0, // Not applicable for continuous data
        confidenceInterval: { lower: 0, upper: 0 },
        continuousValues: variantGroups[name]
      }));
      
      // Basic analysis for continuous data
      const analysis: StatisticalAnalysis = {
        sampleSize: variants.reduce((sum, v) => sum + v.visitors, 0),
        pValue: 0.5, // Default for continuous data without advanced analysis
        confidenceInterval: { lower: 0, upper: 0 },
        uplift: 0, // Calculate based on means for continuous data
        isSignificant: false
      };
      
      return { variants, analysis };
    } else {
      // Handle categorical/binary data (existing logic)
      const results = analyzeABTestFromUpload(data, variantColumnName, conversionColumnName, columns);
      
      // Convert to the expected format
      const variants: VariantResult[] = [
        // Add control first
        {
          name: results.control.variant,
          visitors: results.control.visitors,
          conversions: results.control.conversions,
          conversionRate: results.control.conversion_rate / 100,
          confidenceInterval: calculateConfidenceInterval(results.control.conversions, results.control.visitors)
        },
        // Add other variants
        ...results.results.map(result => ({
          name: result.variant,
          visitors: result.visitors,
          conversions: result.conversions,
          conversionRate: result.conversion_rate / 100,
          confidenceInterval: calculateConfidenceInterval(result.conversions, result.visitors)
        }))
      ];
      
      // Use standard two-proportion z-test for analysis
      const control = variants.find(v => v.name.toLowerCase().includes('control')) || variants[0];
      const treatment = variants.find(v => !v.name.toLowerCase().includes('control')) || variants[1];
      
      let analysis: StatisticalAnalysis;
      if (control && treatment && variants.length >= 2) {
        analysis = twoProportionZTest(
          control.conversions,
          control.visitors,
          treatment.conversions,
          treatment.visitors
        );
      } else {
        analysis = {
          sampleSize: variants.reduce((sum, v) => sum + v.visitors, 0),
          pValue: 0.5,
          confidenceInterval: { lower: 0, upper: 0 },
          uplift: results.results[0]?.uplift || 0,
          isSignificant: false
        };
      }
      
      return { variants, analysis };
    }
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Fallback to original analysis
    const variantGroups: { [key: string]: any[] } = {};
    
    data.forEach(row => {
      const variant = row[variantColumn];
      if (!variantGroups[variant]) {
        variantGroups[variant] = [];
      }
      variantGroups[variant].push(row);
    });
    
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
}