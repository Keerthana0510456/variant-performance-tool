import { ModeResult, StatisticalAnalysis } from '@/types';

export interface ABTestInputs {
  expectedConversionRates: {
    control: number;
    mode: number;
  };
  trafficPerDay: number;
  alpha?: number;
  beta?: number;
  tailType?: 'one-tailed' | 'two-tailed';
  confidenceLevel?: number;
}

export interface ABTestResults {
  sampleSize: number;
  testDuration: number;
  modes: ModeResult[];
  analysis: StatisticalAnalysis;
  summary: {
    winningMode: string;
    confidenceLevel: number;
    pValue: number;
    isStatisticallySignificant: boolean;
    uplift: {
      relative: number;
      absolute: number;
    };
  };
}

export interface DataAnalysisInputs {
  data: any[][];
  modeColumn: number;
  conversionColumn: number;
  columns: string[];
  statisticalParams?: {
    significanceLevel?: number;
    power?: number;
    confidenceLevel?: number;
  };
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

// Normal CDF approximation
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  return x > 0 ? 1 - probability : probability;
}

// Calculate sample size for two-proportion z-test
function calculateSampleSize(
  p1: number,
  p2: number,
  alpha: number = 0.05,
  beta: number = 0.20,
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): number {
  const zAlpha = tailType === 'two-tailed' 
    ? normalInverseCDF(1 - alpha/2)
    : normalInverseCDF(1 - alpha);
  const zBeta = normalInverseCDF(1 - beta);
  
  const pooledP = (p1 + p2) / 2;
  const effect = Math.abs(p2 - p1);
  
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(effect, 2);
  
  return Math.ceil(numerator / denominator);
}

// Calculate test duration
function calculateTestDuration(sampleSize: number, trafficPerDay: number): number {
  return Math.ceil((sampleSize * 2) / trafficPerDay);
}

// Calculate confidence interval
function calculateConfidenceInterval(
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

// Perform two-proportion z-test
function twoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): StatisticalAnalysis {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  
  const standardError = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
  const zScore = (p2 - p1) / standardError;
  
  const pValue = tailType === 'two-tailed' 
    ? 2 * (1 - normalCDF(Math.abs(zScore)))
    : 1 - normalCDF(zScore);
  
  const seDiff = Math.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2));
  const marginOfError = 1.96 * seDiff;
  const diff = p2 - p1;
  
  const confidenceInterval = {
    lower: diff - marginOfError,
    upper: diff + marginOfError
  };
  
  const uplift = ((p2 - p1) / p1) * 100;
  
  return {
    sampleSize: n1 + n2,
    pValue,
    confidenceInterval,
    uplift,
    isSignificant: pValue < 0.05
  };
}

// Main function for A/B test planning calculations
export function calculateABTest(inputs: ABTestInputs): ABTestResults {
  const {
    expectedConversionRates,
    trafficPerDay,
    alpha = 0.05,
    beta = 0.20,
    tailType = 'two-tailed',
    confidenceLevel = 0.95
  } = inputs;

  const sampleSize = calculateSampleSize(
    expectedConversionRates.control,
    expectedConversionRates.mode,
    alpha,
    beta,
    tailType
  );

  const testDuration = calculateTestDuration(sampleSize, trafficPerDay);

  // Create mock modes for planning
  const modes: ModeResult[] = [
    {
      name: 'Control',
      visitors: sampleSize,
      conversions: Math.round(sampleSize * expectedConversionRates.control),
      conversionRate: expectedConversionRates.control,
      confidenceInterval: calculateConfidenceInterval(
        Math.round(sampleSize * expectedConversionRates.control),
        sampleSize,
        confidenceLevel
      )
    },
    {
      name: 'Mode',
      visitors: sampleSize,
      conversions: Math.round(sampleSize * expectedConversionRates.mode),
      conversionRate: expectedConversionRates.mode,
      confidenceInterval: calculateConfidenceInterval(
        Math.round(sampleSize * expectedConversionRates.mode),
        sampleSize,
        confidenceLevel
      )
    }
  ];

  const analysis = twoProportionZTest(
    modes[0].conversions,
    modes[0].visitors,
    modes[1].conversions,
    modes[1].visitors,
    tailType
  );

  const winningMode = expectedConversionRates.mode > expectedConversionRates.control ? 'Mode' : 'Control';
  const upliftRelative = ((expectedConversionRates.mode - expectedConversionRates.control) / expectedConversionRates.control) * 100;
  const upliftAbsolute = expectedConversionRates.mode - expectedConversionRates.control;

  return {
    sampleSize,
    testDuration,
    modes,
    analysis,
    summary: {
      winningMode,
      confidenceLevel,
      pValue: analysis.pValue,
      isStatisticallySignificant: analysis.isSignificant,
      uplift: {
        relative: upliftRelative,
        absolute: upliftAbsolute
      }
    }
  };
}

// Main function for data analysis
export function analyzeABTestData(inputs: DataAnalysisInputs): ABTestResults {
  const { data, modeColumn, conversionColumn, columns } = inputs;

  try {
    // Check if data is continuous
    const conversionValues = data.slice(1).map(row => row[conversionColumn]).filter(val => val !== null && val !== undefined);
    const isContinuous = conversionValues.some(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num !== 0 && num !== 1;
    });

    if (isContinuous) {
      // Handle continuous data
      const modeGroups: { [key: string]: number[] } = {};
      
      data.slice(1).forEach(row => {
        const mode = row[modeColumn];
        const value = parseFloat(row[conversionColumn]);
        
        if (!isNaN(value)) {
          if (!modeGroups[mode]) {
            modeGroups[mode] = [];
          }
          modeGroups[mode].push(value);
        }
      });
      
      const modeNames = Object.keys(modeGroups);
      const modes: ModeResult[] = modeNames.map(name => ({
        name,
        visitors: modeGroups[name].length,
        conversions: 0,
        conversionRate: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        continuousValues: modeGroups[name]
      }));
      
      const analysis: StatisticalAnalysis = {
        sampleSize: modes.reduce((sum, m) => sum + m.visitors, 0),
        pValue: 0.5,
        confidenceInterval: { lower: 0, upper: 0 },
        uplift: 0,
        isSignificant: false
      };
      
      return {
        sampleSize: analysis.sampleSize,
        testDuration: 0,
        modes,
        analysis,
        summary: {
          winningMode: modes[0]?.name || '',
          confidenceLevel: 0.95,
          pValue: analysis.pValue,
          isStatisticallySignificant: analysis.isSignificant,
          uplift: { relative: 0, absolute: 0 }
        }
      };
    } else {
      // Handle binary data
      const modeGroups: { [key: string]: any[] } = {};
      
      data.slice(1).forEach(row => {
        const mode = row[modeColumn];
        if (!modeGroups[mode]) {
          modeGroups[mode] = [];
        }
        modeGroups[mode].push(row);
      });
      
      const modes: ModeResult[] = Object.entries(modeGroups).map(([name, rows]) => {
        const visitors = rows.length;
        const conversions = rows.filter(row => {
          const conversionValue = row[conversionColumn];
          return conversionValue === 'Yes' || conversionValue === '1' || conversionValue === 1 || conversionValue === true;
        }).length;
        
        const conversionRate = visitors > 0 ? conversions / visitors : 0;
        const confidenceInterval = calculateConfidenceInterval(conversions, visitors);
        
        return { name, visitors, conversions, conversionRate, confidenceInterval };
      });
      
      // Find control and test modes
      const control = modes.find(m => m.name.toLowerCase().includes('control')) || modes[0];
      const testMode = modes.find(m => !m.name.toLowerCase().includes('control')) || modes[1];
      
      let analysis: StatisticalAnalysis;
      let winningMode = control?.name || '';
      let upliftRelative = 0;
      let upliftAbsolute = 0;
      
      if (control && testMode) {
        analysis = twoProportionZTest(
          control.conversions,
          control.visitors,
          testMode.conversions,
          testMode.visitors
        );
        
        winningMode = testMode.conversionRate > control.conversionRate ? testMode.name : control.name;
        upliftRelative = ((testMode.conversionRate - control.conversionRate) / control.conversionRate) * 100;
        upliftAbsolute = testMode.conversionRate - control.conversionRate;
      } else {
        analysis = {
          sampleSize: modes.reduce((sum, m) => sum + m.visitors, 0),
          pValue: 0.5,
          confidenceInterval: { lower: 0, upper: 0 },
          uplift: 0,
          isSignificant: false
        };
      }
      
      return {
        sampleSize: analysis.sampleSize,
        testDuration: 0,
        modes,
        analysis,
        summary: {
          winningMode,
          confidenceLevel: 0.95,
          pValue: analysis.pValue,
          isStatisticallySignificant: analysis.isSignificant,
          uplift: { relative: upliftRelative, absolute: upliftAbsolute }
        }
      };
    }
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Fallback analysis
    const modes: ModeResult[] = [
      {
        name: 'Error',
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        confidenceInterval: { lower: 0, upper: 0 }
      }
    ];
    
    const analysis: StatisticalAnalysis = {
      sampleSize: 0,
      pValue: 1,
      confidenceInterval: { lower: 0, upper: 0 },
      uplift: 0,
      isSignificant: false
    };
    
    return {
      sampleSize: 0,
      testDuration: 0,
      modes,
      analysis,
      summary: {
        winningMode: 'Error',
        confidenceLevel: 0.95,
        pValue: 1,
        isStatisticallySignificant: false,
        uplift: { relative: 0, absolute: 0 }
      }
    };
  }
}